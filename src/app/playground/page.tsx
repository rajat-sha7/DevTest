"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play, RotateCcw, Trash2, Terminal, Code2, ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function JSPlayground() {
  const [code, setCode] = useState(`// Welcome to the DevQnA JS Playground!
// Write your JavaScript here and click "Run Code"

function greet(name) {
  console.log("Preparing greeting...");
  return "Hello, " + name + "! Ready to master your interview?";
}

const result = greet("Developer");
console.log(result);

// Try creating a closure or a promise here:
`);
  const [output, setOutput] = useState<{ type: 'log' | 'error' | 'result', content: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = () => {
    setIsRunning(true);
    const logs: { type: 'log' | 'error' | 'result', content: string }[] = [];
    
    // Mock console.log
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push({ 
        type: 'log', 
        content: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') 
      });
      originalLog(...args);
    };

    try {
      // Execute the code
      const result = eval(code);
      if (result !== undefined) {
        logs.push({ 
          type: 'result', 
          content: `Return Value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}` 
        });
      }
    } catch (err: any) {
      logs.push({ type: 'error', content: `Error: ${err.message}` });
    } finally {
      // Restore console.log
      console.log = originalLog;
      setOutput(prev => [...prev, ...logs]);
      setIsRunning(false);
    }
  };

  const clearConsole = () => setOutput([]);
  const resetCode = () => {
    if (confirm("Reset editor to default?")) {
      setCode(`function greet(name) {\n  return "Hello, " + name;\n}\n\nconsole.log(greet("Developer"));`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 font-headline">JS Playground</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={resetCode} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-9">
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reset
          </Button>
          <Button onClick={runCode} disabled={isRunning} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-9 shadow-lg shadow-primary/20">
            <Play className={cn("w-3.5 h-3.5 mr-2 fill-current", isRunning && "animate-pulse")} />
            {isRunning ? "Running..." : "Run Code"}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 grid lg:grid-cols-2 gap-6 overflow-hidden">
        {/* Editor Pane */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Code2 className="w-3 h-3" />
              Editor (JavaScript)
            </div>
          </div>
          <Card className="flex-1 shadow-2xl shadow-slate-200/50 border-none rounded-[2rem] overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full min-h-[500px] p-8 font-code text-[15px] leading-relaxed resize-none border-none focus-visible:ring-0 bg-white"
                placeholder="Write your JS logic here..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Console Pane */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Terminal className="w-3 h-3" />
              Console Output
            </div>
            <Button variant="ghost" size="sm" onClick={clearConsole} className="h-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
          <Card className="flex-1 bg-[#0D1117] border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col ring-1 ring-white/5">
             <CardHeader className="py-4 px-6 border-b border-white/5 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
             </CardHeader>
             <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar font-code text-sm">
                {output.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40 italic">
                    <Terminal className="w-8 h-8 mb-2" />
                    <p>Execute code to see output...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {output.map((line, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "py-1.5 border-l-2 pl-4 break-words",
                          line.type === 'error' ? "border-rose-500 text-rose-400 bg-rose-500/5" :
                          line.type === 'result' ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" :
                          "border-slate-700 text-slate-300"
                        )}
                      >
                        <span className="opacity-30 mr-2 text-[10px] font-bold uppercase tracking-widest">
                          {line.type}
                        </span>
                        <pre className="whitespace-pre-wrap font-code">{line.content}</pre>
                      </div>
                    ))}
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer / Tip */}
      <footer className="p-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-slate-400">
           <div className="p-2 bg-white rounded-lg border border-slate-200">
             <GraduationCap className="w-4 h-4" />
           </div>
           <p className="text-xs font-medium italic">
             Tip: Use this playground to test algorithm logic, closure patterns, or prototype chain behaviors discussed in the Prep dashboard.
           </p>
        </div>
      </footer>
    </div>
  );
}
