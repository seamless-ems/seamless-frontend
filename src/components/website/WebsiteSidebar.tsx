import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Type, Building2, User, Save, Upload, Download, X } from "lucide-react";

type Props = {
  canvasWidth: number;
  canvasHeight: number;
  backgroundImageUrl: string | null;
  backgroundColor: string;
  backgroundInputRef: React.RefObject<HTMLInputElement>;
  handleBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBackground: () => void;
  setCanvasWidth?: (n: number) => void;
  setCanvasHeight?: (n: number) => void;
  setBackgroundColor?: (s: string) => void;
  headshotShape: "circle" | "square" | "rectangle";
  setHeadshotShape: (v: "circle" | "square" | "rectangle") => void;
  testHeadshot: string | null;
  testLogo: string | null;
  headshotInputRef: React.RefObject<HTMLInputElement>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  handleHeadshotUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addElement: (type: "name" | "title" | "company" | "headshot" | "logo") => void;
  handleSave: () => void;
  handleExport: () => void;
};

export default function WebsiteSidebar(props: Props) {
  const {
    canvasWidth,
    canvasHeight,
    backgroundImageUrl,
    backgroundColor,
    backgroundInputRef,
    handleBackgroundUpload,
    handleRemoveBackground,
    setCanvasWidth,
    setCanvasHeight,
    setBackgroundColor,
    headshotShape,
    setHeadshotShape,
    testHeadshot,
    testLogo,
    headshotInputRef,
    logoInputRef,
    handleHeadshotUpload,
    handleLogoUpload,
    addElement,
    handleSave,
    handleExport,
  } = props;

  return (
    <Card className="w-72 flex-shrink-0 overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Click to Add</Label>
          <Button onClick={() => addElement("name")} variant="outline" size="sm" className="w-full justify-start">
            <Type className="mr-2 h-4 w-4" />
            Name (sample)
          </Button>
          <Button onClick={() => addElement("title")} variant="outline" size="sm" className="w-full justify-start">
            <Type className="mr-2 h-4 w-4" />
            Title
          </Button>
          <Button onClick={() => addElement("company")} variant="outline" size="sm" className="w-full justify-start">
            <Building2 className="mr-2 h-4 w-4" />
            Company
          </Button>
          <Button onClick={() => addElement("headshot")} variant="outline" size="sm" className="w-full justify-start" disabled={!testHeadshot}>
            <User className="mr-2 h-4 w-4" />
            Headshot {!testHeadshot && "(upload first)"}
          </Button>
          <Button onClick={() => addElement("logo")} variant="outline" size="sm" className="w-full justify-start" disabled={!testLogo}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Logo {!testLogo && "(upload first)"}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label className="text-xs font-semibold">Background</Label>
          {backgroundImageUrl ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Canvas: {canvasWidth}x{canvasHeight}px</div>
              <Button onClick={handleRemoveBackground} variant="outline" size="sm" className="w-full">
                <X className="mr-2 h-4 w-4" /> Remove Background
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={() => backgroundInputRef.current?.click()} variant="outline" size="sm" className="w-full">
                <Upload className="mr-2 h-4 w-4" /> Upload Background
              </Button>
              <input ref={backgroundInputRef} type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
              <div className="space-y-2">
                <Label className="text-xs">Or set manually:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth?.(Number(e.target.value) || 0)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight?.(Number(e.target.value) || 0)} className="h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor?.(e.target.value)} className="h-8" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-xs font-semibold">Test Images (Preview Only)</Label>
          <div className="space-y-2">
            <Label className="text-xs">Headshot Shape</Label>
            <Select value={headshotShape} onValueChange={(value: "circle" | "square" | "rectangle") => setHeadshotShape(value)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="rectangle">Rectangle (Horizontal)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Upload Test Headshot</Label>
            <Button onClick={() => headshotInputRef.current?.click()} variant="outline" size="sm" className="w-full">
              <Upload className="mr-2 h-4 w-4" /> {testHeadshot ? "Replace Headshot" : "Upload Headshot"}
            </Button>
            <input ref={headshotInputRef} type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Upload Test Logo</Label>
            <Button onClick={() => logoInputRef.current?.click()} variant="outline" size="sm" className="w-full">
              <Upload className="mr-2 h-4 w-4" /> {testLogo ? "Replace Logo" : "Upload Logo"}
            </Button>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Button onClick={handleSave} size="sm" className="w-full">
            <Save className="mr-2 h-4 w-4" /> Save Template
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
            <Download className="mr-2 h-4 w-4" /> Export PNG
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
