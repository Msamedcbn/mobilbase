import { describe, expect, it } from "vitest";
import { BLOG_POSTS, BlogPost } from "@/lib/blog-posts";

function normalizeTurkish(str: string): string {
  return str
    .toLocaleLowerCase("tr-TR")
    .replace(/[''’"„”]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function calculateSeoScore(post: BlogPost): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  const fkNorm = normalizeTurkish(post.focusKeyword);
  const fkWords = fkNorm.split(/\s+/).filter(Boolean);

  const titleNorm = normalizeTurkish(post.metaTitle || post.title);
  const descNorm = normalizeTurkish(post.description);
  const slugNorm = normalizeTurkish(post.slug.replace(/-/g, " "));
  const firstSecNorm = normalizeTurkish(post.sections[0]?.paragraphs?.join(" ") || "");
  const allTextNorm = normalizeTurkish(
    post.sections.flatMap((s) => [...(s.paragraphs || []), ...(s.list || [])]).join(" ")
  );

  // 1. Focus keyword in Title (+15)
  const titleMatches = fkWords.every((w) => titleNorm.includes(w));
  if (titleMatches) {
    score += 15;
    details.push("Focus keyword in title (+15)");
  } else {
    details.push("MISSING: Focus keyword in title");
  }

  // 2. Focus keyword in Meta Description (+15)
  const descMatches = fkWords.every((w) => descNorm.includes(w));
  if (descMatches) {
    score += 15;
    details.push("Focus keyword in description (+15)");
  } else {
    details.push("MISSING: Focus keyword in description");
  }

  // 3. Focus keyword in Slug (+10)
  const slugMatches = fkWords.every((w) => slugNorm.includes(w));
  if (slugMatches) {
    score += 10;
    details.push("Focus keyword in slug (+10)");
  } else {
    details.push("MISSING: Focus keyword in slug");
  }

  // 4. Focus keyword in Intro (+15)
  const introMatches = fkWords.every((w) => firstSecNorm.includes(w));
  if (introMatches) {
    score += 15;
    details.push("Focus keyword in intro paragraph (+15)");
  } else {
    details.push("MISSING: Focus keyword in intro paragraph");
  }

  // 5. Meta Title Length (+10)
  const metaTitleLen = (post.metaTitle || post.title).length;
  if (metaTitleLen >= 30 && metaTitleLen <= 75) {
    score += 10;
    details.push(`Optimal Meta Title length (${metaTitleLen} chars) (+10)`);
  } else {
    details.push(`Suboptimal Meta Title length (${metaTitleLen} chars)`);
  }

  // 6. Meta Description Length (+10)
  const descLen = post.description.length;
  if (descLen >= 110 && descLen <= 170) {
    score += 10;
    details.push(`Optimal Meta Description length (${descLen} chars) (+10)`);
  } else {
    details.push(`Suboptimal Meta Description length (${descLen} chars)`);
  }

  // 7. Keywords list count (+5)
  if (post.keywords && post.keywords.length >= 4) {
    score += 5;
    details.push(`Rich keywords list (${post.keywords.length} items) (+5)`);
  } else {
    details.push(`Low keywords count (${post.keywords?.length || 0})`);
  }

  // 8. Tags defined (+5)
  if (post.tags && post.tags.length >= 1) {
    score += 5;
    details.push(`Tags defined (${post.tags.length} tags) (+5)`);
  } else {
    details.push("MISSING: Tags");
  }

  // 9. Word count depth (+10)
  const rawWords = allTextNorm.split(/\s+/).filter(Boolean).length;
  if (rawWords >= 200) {
    score += 10;
    details.push(`Good article word count (${rawWords} words) (+10)`);
  } else {
    details.push(`Low word count (${rawWords} words)`);
  }

  // 10. Headings structure (+5)
  const headingsCount = post.sections.filter((s) => s.heading).length;
  if (headingsCount >= 3) {
    score += 5;
    details.push(`Solid heading structure (${headingsCount} headings) (+5)`);
  } else {
    details.push(`Insufficient headings (${headingsCount})`);
  }

  return { score, details };
}

describe("SEO Score Verification for All Blog Posts", () => {
  it("should have at least 15 blog posts in total", () => {
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(15);
  });

  const regionalPosts = BLOG_POSTS.filter(
    (p) => p.tags.includes("İstanbul") || p.tags.includes("Türkiye")
  );

  it("should have regional focus blog posts for Istanbul and Turkey", () => {
    expect(regionalPosts.length).toBeGreaterThanOrEqual(5);
  });

  regionalPosts.forEach((post) => {
    it(`Regional Post "${post.slug}" must achieve SEO Score >= 90`, () => {
      const { score, details } = calculateSeoScore(post);
      if (score < 90) {
        console.error(`Post ${post.slug} scored ${score}/100. Details:\n` + details.join("\n"));
      }
      expect(score).toBeGreaterThanOrEqual(90);
    });
  });
});
