
"use server";

import { z } from "zod";

const urlSchema = z.string().url({ message: "Please enter a valid URL." });

/**
 * Basic HTML sanitizer. It removes scripts, styles, and dangerous event handler 
 * attributes to reduce security risks, while trying to preserve the main content
 * and structure of the page.
 * @param html The raw HTML string.
 * @returns Sanitized HTML string.
 */
function sanitizeHtml(html: string): string {
    let sanitized = html;
    
    // Remove script, style, and comment blocks entirely
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/gi, "");

    // Remove event handlers (e.g., onclick, onmouseover)
    sanitized = sanitized.replace(/\s(on\w+)=(".*?"|'.*?'|[^\s>]+)/gi, '');
    
    // Remove javascript from href attributes
    sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');

    return sanitized;
}

/**
 * Server action to fetch content from a URL.
 * @param url The URL to fetch.
 * @returns An object with success status and either the sanitized HTML content or an error message.
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

        const sanitizedContent = sanitizeHtml(htmlContent);

        // Prepend a <base> tag to the <head> to handle relative URLs for images, links, etc.
        const finalUrl = response.url;
        if (/<head/i.test(sanitizedContent) && !/<base\s/i.test(sanitizedContent)) {
            const baseTag = `<base href="${finalUrl}" target="_blank">`;
            return { success: true, content: sanitizedContent.replace(/(<head[^>]*>)/i, `$1${baseTag}`) };
        }

        return { success: true, content: sanitizedContent };

    } catch (error) {
        if (error instanceof Error) {
            // Provide more user-friendly error messages for common network issues
            if (error.message.toLowerCase().includes('fetch failed')) {
                 return { success: false, error: "Could not connect to the URL. Please check the address and your network connection." };
            }
            return { success: false, error: `An error occurred: ${error.message}` };
        }
        return { success: false, error: "An unknown error occurred while fetching the URL." };
    }
}
