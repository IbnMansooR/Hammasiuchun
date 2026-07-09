import ArticleForm from "@/components/ArticleForm";

export const metadata = { title: "Admin — Yangi maqola" };

export default function NewArticle() {
  return (
    <>
      <h1>Yangi maqola</h1>
      <ArticleForm />
    </>
  );
}
