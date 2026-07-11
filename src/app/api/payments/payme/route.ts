import { db } from "@/lib/db";
import { checkPaymeAuth, PaymeError, rpcError, rpcResult } from "@/lib/payme";
import { getSiteSettings, centsToTiyin } from "@/lib/settings";
import { grantOrderPurchases } from "@/lib/purchases";

export const runtime = "nodejs";

type RpcRequest = {
  id: unknown;
  method: string;
  params: Record<string, unknown>;
};

async function expectedAmountTiyin(orderId: number): Promise<number | null> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  const { usdToUzsRate } = await getSiteSettings();
  return centsToTiyin(order.totalCents, usdToUzsRate);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RpcRequest | null;
  if (!body || typeof body.method !== "string") {
    return Response.json(rpcError(null, PaymeError.PARSE_ERROR, "Parse error"), { status: 200 });
  }
  const { id, method, params } = body;

  if (!checkPaymeAuth(req.headers.get("authorization"))) {
    return Response.json(rpcError(id, PaymeError.INVALID_AUTH, "Invalid authorization"), { status: 200 });
  }

  try {
    switch (method) {
      case "CheckPerformTransaction": {
        const orderId = Number((params.account as { order_id?: string })?.order_id);
        const amount = Number(params.amount);
        if (!Number.isInteger(orderId)) return Response.json(rpcError(id, PaymeError.ACCOUNT_NOT_FOUND, "Order not found"));
        const expected = await expectedAmountTiyin(orderId);
        if (expected === null) return Response.json(rpcError(id, PaymeError.ACCOUNT_NOT_FOUND, "Order not found"));
        if (expected !== amount) return Response.json(rpcError(id, PaymeError.INVALID_AMOUNT, "Invalid amount"));
        return Response.json(rpcResult(id, { allow: true }));
      }

      case "CreateTransaction": {
        const paymeId = String(params.id);
        const orderId = Number((params.account as { order_id?: string })?.order_id);
        const amount = Number(params.amount);
        const time = Number(params.time);

        const existing = await db.paymeTransaction.findUnique({ where: { id: paymeId } });
        if (existing) {
          return Response.json(rpcResult(id, {
            create_time: Number(existing.createTime), transaction: existing.id, state: existing.state,
          }));
        }

        const expected = await expectedAmountTiyin(orderId);
        if (expected === null) return Response.json(rpcError(id, PaymeError.ACCOUNT_NOT_FOUND, "Order not found"));
        if (expected !== amount) return Response.json(rpcError(id, PaymeError.INVALID_AMOUNT, "Invalid amount"));

        // Only one active (non-cancelled) transaction per order at a time.
        const active = await db.paymeTransaction.findFirst({ where: { orderId, state: { in: [1, 2] } } });
        if (active) return Response.json(rpcError(id, PaymeError.UNABLE_TO_PERFORM, "Order already has a transaction"));

        const created = await db.paymeTransaction.create({
          data: { id: paymeId, orderId, amount, state: 1, createTime: BigInt(time) },
        });
        return Response.json(rpcResult(id, { create_time: Number(created.createTime), transaction: created.id, state: created.state }));
      }

      case "PerformTransaction": {
        const paymeId = String(params.id);
        const tx = await db.paymeTransaction.findUnique({ where: { id: paymeId } });
        if (!tx) return Response.json(rpcError(id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"));
        if (tx.state === 2) {
          return Response.json(rpcResult(id, { transaction: tx.id, perform_time: Number(tx.performTime), state: 2 }));
        }
        if (tx.state !== 1) return Response.json(rpcError(id, PaymeError.UNABLE_TO_PERFORM, "Cannot perform"));

        const performTime = BigInt(Date.now());
        const updated = await db.paymeTransaction.update({ where: { id: paymeId }, data: { state: 2, performTime } });
        await grantOrderPurchases(tx.orderId, "payme");
        return Response.json(rpcResult(id, { transaction: updated.id, perform_time: Number(updated.performTime), state: 2 }));
      }

      case "CancelTransaction": {
        const paymeId = String(params.id);
        const reason = Number(params.reason);
        const tx = await db.paymeTransaction.findUnique({ where: { id: paymeId } });
        if (!tx) return Response.json(rpcError(id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"));
        if (tx.state === -1 || tx.state === -2) {
          return Response.json(rpcResult(id, { transaction: tx.id, cancel_time: Number(tx.cancelTime), state: tx.state }));
        }
        const newState = tx.state === 2 ? -2 : -1;
        const cancelTime = BigInt(Date.now());
        const updated = await db.paymeTransaction.update({ where: { id: paymeId }, data: { state: newState, cancelTime, reason } });
        return Response.json(rpcResult(id, { transaction: updated.id, cancel_time: Number(updated.cancelTime), state: updated.state }));
      }

      case "CheckTransaction": {
        const paymeId = String(params.id);
        const tx = await db.paymeTransaction.findUnique({ where: { id: paymeId } });
        if (!tx) return Response.json(rpcError(id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"));
        return Response.json(rpcResult(id, {
          create_time: Number(tx.createTime), perform_time: Number(tx.performTime), cancel_time: Number(tx.cancelTime),
          transaction: tx.id, state: tx.state, reason: tx.reason ?? null,
        }));
      }

      case "GetStatement": {
        const from = Number((params as { from?: number }).from ?? 0);
        const to = Number((params as { to?: number }).to ?? Date.now());
        const txs = await db.paymeTransaction.findMany({
          where: { createTime: { gte: BigInt(from), lte: BigInt(to) } },
          orderBy: { createTime: "asc" },
        });
        return Response.json(rpcResult(id, {
          transactions: txs.map((tx) => ({
            id: tx.id, time: Number(tx.createTime), amount: tx.amount,
            account: { order_id: String(tx.orderId) },
            create_time: Number(tx.createTime), perform_time: Number(tx.performTime), cancel_time: Number(tx.cancelTime),
            transaction: tx.id, state: tx.state, reason: tx.reason ?? null,
          })),
        }));
      }

      default:
        return Response.json(rpcError(id, PaymeError.METHOD_NOT_FOUND, "Method not found"));
    }
  } catch {
    return Response.json(rpcError(id, PaymeError.UNABLE_TO_PERFORM, "Internal error"));
  }
}
