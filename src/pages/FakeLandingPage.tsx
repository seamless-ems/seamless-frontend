import { error } from "console";
import React, { useState, useEffect } from "react";

const sampleIframe = `
<iframe src="https://example.com/embed" width="800" height="450" frameborder="0" allowfullscreen></iframe>
`;

export default function FakeLandingPage(): JSX.Element {
  const [iframeSnippet, setIframeSnippet] = useState<string>(sampleIframe);
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("fake-landing-dark") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const snippetId = params.get("snippetId");
      if (snippetId) {
        try {
          const stored = localStorage.getItem(snippetId);
          if (stored) {
            setIframeSnippet(stored);
            try {
              localStorage.removeItem(snippetId);
            } catch {
              console.error(
                "Failed to remove stored snippet after loading:",
                snippetId,
              );
            }
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      const snippet = params.get("snippet");
      if (snippet) {
        setIframeSnippet(snippet);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("fake-landing-dark", dark ? "1" : "0");
    } catch {}
  }, [dark]);

  return (
    <div
      className={`${dark ? "dark" : ""} min-h-screen flex flex-col bg-background text-foreground`}
    >
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Seamless</span>
          <span className={`text-xs ${dark ? "text-white" : "text-accent"}`}>
            Fake Landing
          </span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="h-8 w-8 rounded flex items-center justify-center border border-border bg-card hover:bg-muted/20"
            title="Toggle dark mode for this page"
          >
            {dark ? "🌙" : "☀️"}
          </button>
          <a className="text-sm text-semibold" href="#hero">
            Home
          </a>
          <a className="text-sm text-primary" href="#about">
            About
          </a>
          <a className="text-sm text-primary" href="#iframe-preview">
            Embed Preview
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section id="hero" className="px-6 py-12 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Build beautiful speaker embeds
              </h1>
              <p className="text-lg text-primary mb-6">
                A minimal fake landing page for local preview and testing of
                embed snippets.
              </p>
              <div className="flex gap-3">
                <button
                  className={`px-4 py-2 bg-primary ${dark ? "text-black" : "text-white"} rounded`}
                >
                  Get started
                </button>
                <button className="px-4 py-2 bg-secondary/20 text-primary rounded">
                  Learn more
                </button>
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-sm text-primary mb-2">
                Live embed preview
              </div>
              <div className="w-full h-48 bg-muted/10 flex items-center justify-center text-primary">
                Example card preview area
              </div>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="px-6 py-12 border-t border-border bg-background/50"
        >
          <div className="px-6 max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">About us</h2>
            <p className="text-primary mb-4">
              Seamless Fake Landing is a demo frontend for speaker cards and
              embeds. This page provides placeholders for quickly previewing
              iframe snippets in-context.
            </p>
            <p className="text-primary">
              Use this page to test how an embed will look when inserted into a
              simple landing page layout.
            </p>
          </div>
        </section>

        <section id="iframe-preview" className="px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Speakers</h2>
          <div className="grid md:grid-cols-1 gap-6">
            <div>
              <div className="border rounded-lg overflow-hidden">
                <div className="w-full h-full bg-muted/5 flex items-center justify-center">
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: iframeSnippet }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/95 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center gap-4 text-sm text-primary">
          <div>© {new Date().getFullYear()} Seamless — demo landing</div>
          <div className="ml-auto">Built for previewing embed snippets</div>
        </div>
      </footer>
    </div>
  );
}
