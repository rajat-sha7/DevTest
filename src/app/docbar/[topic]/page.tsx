// src/app/docbar/[topic]/page.tsx
"use client";

import { docData } from "@/app/docData";
import DocSlider from "@/components/DocSlider";

export default function DocTopicPage({ params }: { params: { topic: string } }) {
  const images = docData[params.topic] ?? [];

  return (
    <section className="min-h-screen bg-background py-12 px-4 md:px-8">
      <h1 className="text-3xl font-bold text-center mb-6 capitalize">
        {params.topic} Documentation
      </h1>
      {images.length > 0 ? (
        <DocSlider images={images} />
      ) : (
        <p className="text-center text-muted-foreground">
          No documentation available for this topic.
        </p>
      )}
    </section>
  );
}
