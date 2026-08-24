import type { MetadataRoute } from "next";

const SITE = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/dashboard/", "/*/dashboard"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
