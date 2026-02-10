import React from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";

type Props = {
  onMount: (editor: Editor) => void;
  backgroundColor?: string;
};

export default function WebsiteCanvas({ onMount, backgroundColor }: Props) {
  return (
    <div className="flex-1 border rounded-lg overflow-hidden" style={{ backgroundColor }}>
      <Tldraw onMount={(editor) => onMount(editor)} />
    </div>
  );
}
