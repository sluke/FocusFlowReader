
"use server";

import { z } from "zod";

const urlSchema = z.string().url({ message: "Please enter a valid URL." });

/**
 * Basic HTML sanitizer. It removes script and style tags, then converts all other tags
 * to spaces to preserve word separation, and finally cleans up whitespace.
 * @param html The raw HTML string.
 * @returns Sanitized plain text content.
 */
function sanitizeHtml(html: string): string {
    let text = html;
    
    // Remove script and style blocks
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

    // Replace all other tags with a space
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode common HTML entities
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    };
    text = text.replace(/&[a-z]+;/gi, (entity) => entities[entity] || entity);

    // Collapse multiple whitespace characters into a single space
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Server action to fetch content from a URL.
 * @param url The URL to fetch.
 * @returns An object with success status and either the content or an error message.
 */
export async function getUrlContent(url: string) {
    const validation = urlSchema.safeParse(url);
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return { success: false, error: `Failed to fetch URL. Server responded with status: ${response.status}` };
        }

        const htmlContent = await response.text();
        if (!htmlContent) {
            return { success: false, error: "The URL returned no content." };
        }

        const textContent = sanitizeHtml(htmlContent);

        return { success: true, content: textContent };

    } catch (error) {
        if (error instanceof Error) {
            // Provide more user-friendly error messages for common network issues
            if (error.message.includes('fetch failed')) {
                 return { success: false, error: "Could not connect to the URL. Please check the address and your network connection." };
            }
            return { success: false, error: `An error occurred: ${error.message}` };
        }
        return { success: false, error: "An unknown error occurred while fetching the URL." };
    }
}
