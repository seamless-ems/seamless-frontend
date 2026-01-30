import WebsiteCardBuilder from "@/components/WebsiteCardBuilder";

export default function WebsiteCardBuilderTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Website Card Builder - Test</h1>
        <p className="text-muted-foreground mt-2">
          Standalone test environment for the Website Card Builder component using tldraw.
        </p>
      </div>
      <WebsiteCardBuilder
        onSave={(template) => {
          console.log("Template saved:", template);
        }}
      />
    </div>
  );
}
