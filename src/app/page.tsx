
"use client";

import React, { useState, type ReactNode, useTransition } from 'react';
import { BookOpen, Loader2, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function Home() {
  const [textValue, setTextValue] = useState('');
  const [processedContent, setProcessedContent] = useState<ReactNode | ReactNode[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [highlightPercentage, setHighlightPercentage] = useState(80);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const highlightStyles = [
    'font-bold text-chart-1',
    'italic text-chart-2',
    'font-highlight text-chart-3',
    'bg-chart-4/30 rounded-[3px] px-0.5',
    'font-highlight font-bold text-chart-5',
  ];

  const applyHighlighting = (text: string, keyPrefix: string) => {
    const tokens = text.split(/([^\p{L}\p{N}']+)/gu);
    let wordIndex = 0;
    return tokens.map((token, index) => {
      if (/[\p{L}\p{N}]/u.test(token)) {
        // Use a deterministic approach based on word index instead of Math.random()
        const shouldHighlight = (wordIndex * 13) % 100 < highlightPercentage;
        if (shouldHighlight) {
          const styleIndex = wordIndex % highlightStyles.length;
          wordIndex++;
          return <span key={`${keyPrefix}-${index}`} className={highlightStyles[styleIndex]}>{token}</span>;
        }
        wordIndex++;
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
  
  const handleSubmit = async () => {
    setProcessedContent(null);
    if (textValue) {
      startTransition(() => {
        processAndSetContent(textValue);
      });
    }
  };

  return (
    <div className="flex h-screen bg-secondary/40">
      <aside
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300 ease-in-out",
          isPanelOpen ? "w-full md:w-1/3 lg:w-1/4" : "w-0 p-0 border-none"
        )}
      >
        <div className={cn("flex-grow p-4 space-y-4 overflow-y-auto", !isPanelOpen && "hidden")}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">FocusFlow Reader</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste text to reformat it for better focus.
          </p>

          <div className="pt-2">
            <Label htmlFor="text-input" className="sr-only">Paste Text</Label>
            <Textarea
              id="text-input"
              placeholder="Paste your content here..."
              className="h-40 resize-y"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
          </div>
          
          <div className="space-y-4">
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
            <Button
              onClick={handleSubmit}
              disabled={isPending || !textValue}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1">
        <header className="p-2 border-b bg-background flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                {isPanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                <span className="sr-only">Toggle Panel</span>
            </Button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto">
            <Card className="flex-grow w-full max-w-4xl mx-auto min-h-full">
            <CardContent className="p-6 h-full">
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
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground min-h-[40vh]">
                    <BookOpen className="h-16 w-16 text-primary/50 mb-4" />
                    <h3 className="text-2xl font-semibold mb-2">Welcome to FocusFlow Reader</h3>
                    <p className="max-w-md">Your processed text will appear here. Simply paste your text in the form and click 'Generate' to begin.</p>
                </div>
                )}
            </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}
