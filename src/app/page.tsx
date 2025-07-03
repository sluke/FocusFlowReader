
"use client";

import React, { useState, type ReactNode, useTransition } from 'react';
import { BookOpen, Link as LinkIcon, Loader2, Sparkles, Type } from 'lucide-react';

import { getUrlContent } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [inputType, setInputType] = useState('text');
  const [textValue, setTextValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [processedContent, setProcessedContent] = useState<ReactNode | ReactNode[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [highlightPercentage, setHighlightPercentage] = useState(30);

  const highlightStyles = [
    'font-bold text-chart-1',
    'italic text-chart-2',
    'font-highlight text-chart-3',
    'bg-chart-4/30 rounded-[3px] px-0.5',
    'font-highlight font-bold text-chart-5',
  ];

  const applyHighlighting = (text: string, keyPrefix: string) => {
    const tokens = text.split(/([^\p{L}\p{N}']+)/gu);
    return tokens.map((token, index) => {
      if (/[\p{L}\p{N}]/u.test(token)) {
        if (Math.random() < highlightPercentage / 100) {
          const randomStyle = highlightStyles[Math.floor(Math.random() * highlightStyles.length)];
          return <span key={`${keyPrefix}-${index}`} className={randomStyle}>{token}</span>;
        }
      }
      return <span key={`${keyPrefix}-${index}`}>{token}</span>;
    });
  };

  const processAndSetContent = (text: string) => {
    if (!text) {
      setProcessedContent(null);
      return;
    }
    const paragraphs = text.split(/\n+/).map((para, pIndex) => {
      if (!para.trim()) return null;
      return <p key={pIndex}>{applyHighlighting(para, `p-${pIndex}`)}</p>;
    }).filter(Boolean);

    setProcessedContent(paragraphs);
  };
  
  const processHtmlAndSetContent = (html: string) => {
    if (typeof window === 'undefined' || !html) {
      setProcessedContent(null);
      return;
    }

    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, 'text/html');

    const domNodeToReact = (node: Node, key: string, isHighlightingEnabled: boolean = true): ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.trim()) return text;
        return isHighlightingEnabled ? applyHighlighting(text, key) : text;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        const unsupportedTags = ['script', 'style', 'iframe', 'head', 'meta', 'link', 'title', 'noscript'];
        if (unsupportedTags.includes(tagName)) {
            return null;
        }

        const tagsToSkipHighlighting = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'a', 'th', 'code', 'pre'];
        const highlightChildren = isHighlightingEnabled && !tagsToSkipHighlighting.includes(tagName);

        const children = Array.from(element.childNodes)
            .map((child, i) => domNodeToReact(child, `${key}-${i}`, highlightChildren))
            .filter(Boolean);

        const props: {[key: string]: any} = { key };
        Array.from(element.attributes).forEach(attr => {
            const lowerCaseName = attr.name.toLowerCase();
            if (lowerCaseName.startsWith('on')) {
                return;
            }

            let propName = attr.name;
            if (lowerCaseName === 'class') {
                propName = 'className';
            } else if (lowerCaseName === 'for') {
                propName = 'htmlFor';
            } else if (lowerCaseName === 'viewbox') {
                propName = 'viewBox';
            } else if (lowerCaseName === 'stroke-width') {
                propName = 'strokeWidth';
            } else if (lowerCaseName === 'stroke-linecap') {
                propName = 'strokeLinecap';
            } else if (lowerCaseName === 'stroke-linejoin') {
                propName = 'strokeLinejoin';
            } else if (lowerCaseName === 'fill-rule') {
                propName = 'fillRule';
            } else if (lowerCaseName === 'clip-rule') {
                propName = 'clipRule';
            }


            props[propName] = attr.value;
        });

        return React.createElement(tagName, props, ...children);
      }
      return null;
    };

    const processedNodes = Array.from(doc.body.childNodes)
      .map((node, i) => domNodeToReact(node, `node-${i}`))
      .filter(Boolean);
    
    setProcessedContent(processedNodes);
  };

  const handleSubmit = async () => {
    setProcessedContent(null);
    if (inputType === 'text' && textValue) {
      startTransition(() => {
        processAndSetContent(textValue);
      });
    } else if (inputType === 'url' && urlValue) {
      startTransition(async () => {
        const result = await getUrlContent(urlValue);
        if (result.success) {
          processHtmlAndSetContent(result.content);
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching URL",
            description: result.error,
          });
          setProcessedContent(null);
        }
      });
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
             <BookOpen className="h-6 w-6 text-primary" />
             <h1 className="text-xl font-semibold">FocusFlow Reader</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste text or enter a URL to reformat it for better focus.
          </p>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <Tabs value={inputType} onValueChange={setInputType} className="h-full flex flex-col">
            <TabsList className="mx-4 grid w-auto grid-cols-2">
              <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/> Paste Text</TabsTrigger>
              <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4"/> From URL</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="flex-grow p-4 pt-2">
              <Label htmlFor="text-input" className="sr-only">Paste Text</Label>
              <Textarea
                id="text-input"
                placeholder="Paste your content here..."
                className="h-full resize-none"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="url" className="flex-grow p-4 pt-2">
              <Label htmlFor="url-input" className="sr-only">From URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
              />
            </TabsContent>
          </Tabs>
        </SidebarContent>
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="highlight-percentage">Highlight Percentage ({highlightPercentage}%)</Label>
            <Slider
              id="highlight-percentage"
              min={0}
              max={100}
              step={1}
              value={[highlightPercentage]}
              onValueChange={(value) => setHighlightPercentage(value[0])}
            />
          </div>
        </div>
        <SidebarFooter className="p-4 pt-0">
          <Button
            onClick={handleSubmit}
            disabled={isPending || (inputType === 'text' && !textValue) || (inputType === 'url' && !urlValue)}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="p-4">
        <header className="flex items-center gap-4 mb-4">
          <SidebarTrigger />
          <h2 className="text-2xl font-bold tracking-tight">Processed Content</h2>
        </header>
        <Card className="flex-grow h-[calc(100vh-8rem)]">
          <CardContent className="p-6 h-full overflow-y-auto">
            {isPending ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg">Processing your content...</p>
              </div>
            ) : processedContent ? (
              <div className="prose prose-lg max-w-none text-foreground leading-relaxed">
                {processedContent}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <BookOpen className="h-16 w-16 text-primary/50 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Welcome to FocusFlow Reader</h3>
                <p className="max-w-md">Your processed text will appear here. Simply paste your text or enter a URL in the sidebar and click 'Generate' to begin.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </SidebarInset>
    </SidebarProvider>
  );
}
