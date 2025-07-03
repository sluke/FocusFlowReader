
"use server";

import { z } from "zod";

const urlSchema = z.string().url({ message: "Please enter a valid URL." });

/**
 * Basic HTML sanitizer. It attempts to preserve basic document structure like
 * paragraphs and lists by converting block-level tags to newlines, while stripping
 * out all other HTML, scripts, and styles.
 * @param html The raw HTML string.
 * @returns Sanitized plain text content with preserved structure.
 */
function sanitizeHtml(html: string): string {
    let text = html;
    
    // Remove script, style, and comment blocks
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<!--[\s\S]*?-->/gi, "");

    // Replace block-level tags with newlines to preserve structure
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|dt|dd)>/gi, "\n");
    
    // Replace all other HTML tags with a space
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

    // Clean up whitespace
    // 1. Collapse multiple spaces/tabs into a single space
    text = text.replace(/[ \t]+/g, ' ');
    // 2. Trim whitespace from the start/end of each line
    text = text.split('\n').map(line => line.trim()).join('\n');
    // 3. Collapse multiple newlines into a maximum of two (to create paragraph breaks)
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
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
