'use client';

import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Video,
  Table as TableIcon,
  Bold,
  Italic,
  List,
  Heading,
  Code,
  FileText,
  Plus,
  Image,
  Loader2,
  X,
  Link,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
} from 'lucide-react';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (val: string) => void;
  onOpenAICopilot?: () => void;
}

export function WYSIWYGEditor({ value, onChange, onOpenAICopilot }: WYSIWYGEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAlignment, setImageAlignment] = useState<'left' | 'center' | 'right' | 'full'>('center');
  const [imageAltText, setImageAltText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Check slash command trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastLine = textBeforeCursor.split('\n').pop() || '';

    if (lastLine.trim() === '/') {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const insertText = (template: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Remove preceding '/' if slash menu was active
    let currentVal = value;
    if (showSlashMenu) {
      const beforeSlash = value.substring(0, start).replace(/\/$/, '');
      const afterSlash = value.substring(end);
      currentVal = beforeSlash + afterSlash;
    }

    const newVal = currentVal.substring(0, start) + template + currentVal.substring(start);
    onChange(newVal);
    setShowSlashMenu(false);

    setTimeout(() => {
      textarea.focus();
    }, 50);
  };

  const slashCommands = [
    {
      label: '/callout (กล่องคำเตือนสีแดง)',
      icon: AlertTriangle,
      desc: 'แทรกบล็อกเน้นย้ำจุดสำคัญหรือโทษทางวินัย',
      action: () =>
        insertText(`\n> [!WARNING]\n> คำเตือนสำคัญ: โปรดตรวจสอบข้อมูลและยื่นเอกสารให้ครบถ้วนก่อนส่งระบบ\n`),
    },
    {
      label: '/ai (เรียก AI ช่วยเขียน)',
      icon: Sparkles,
      desc: 'เปิดแถบ AI Writing Copilot เพื่อสร้างโครงร่างเอกสาร',
      action: () => {
        setShowSlashMenu(false);
        if (onOpenAICopilot) onOpenAICopilot();
      },
    },
    {
      label: '/video (แปะวิดีโอสาธิตงาน)',
      icon: Video,
      desc: 'แทรกวิดีโอ YouTube / Vimeo สำหรับสาธิตขั้นตอนการทำงาน',
      action: () =>
        insertText(
          `\n📹 **วิดีโอสาธิตการทำงาน (Demo Video)**:\n[![ดูวิดีโอสาธิต](https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n`
        ),
    },
    {
      label: '/table (ตารางข้อมูล)',
      icon: TableIcon,
      desc: 'แทรกตารางข้อมูลเปรียบเทียบหรือเกณฑ์การอนุมัติ',
      action: () =>
        insertText(
          `\n| ขั้นตอน | การดำเนินการ | ผู้รับผิดชอบ |\n| :--- | :--- | :--- |\n| 1 | ตรวจสอบเอกสาร | เจ้าหน้าที่ CS |\n| 2 | อนุมัติการคืนเงิน | Supervisor |\n`
        ),
    },
    {
      label: '/image (แทรกรูปภาพ)',
      icon: Image,
      desc: 'อัปโหลดรูปภาพหรือวาง URL รูปภาพ พร้อมปรับตำแหน่ง (ซ้าย/กลาง/ขวา/เต็ม)',
      action: () => {
        setShowSlashMenu(false);
        setShowImageDialog(true);
      },
    },
    {
      label: '/link (แทรกไฮเปอร์ลิงก์)',
      icon: Link,
      desc: 'สร้างลิงก์เชื่อมโยงไปยัง URL ภายนอก หรือเอกสารภายในระบบ',
      action: () => {
        setShowSlashMenu(false);
        handleOpenLinkDialog();
      },
    },
  ];

  const handleOpenLinkDialog = () => {
    if (textareaRef.current) {
      const selected = value.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd);
      setLinkText(selected || '');
    }
    setLinkUrl('');
    setShowLinkDialog(true);
  };

  const handleInsertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const text = linkText.trim() || url;
    // Validate URL - prepend https:// if missing protocol, but keep relative paths intact
    let finalUrl = url;
    if (
      !/^https?:\/\//i.test(url) &&
      !/^mailto:/i.test(url) &&
      !url.startsWith('/') &&
      !url.startsWith('#') &&
      !url.startsWith('.')
    ) {
      finalUrl = 'https://' + url;
    }
    const markdown = `[${text}](${finalUrl})`;
    insertText(markdown);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alignment', imageAlignment);

      const res = await fetch('/api/sops/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const alt = imageAltText || file.name.replace(/\.[^/.]+$/, '');
      insertImageMarkdown(data.url, alt);
      resetImageDialog();
    } catch (err: any) {
      alert(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlInsert = () => {
    if (!imageUrlInput.trim()) return;
    const alt = imageAltText || 'รูปภาพประกอบ';
    insertImageMarkdown(imageUrlInput.trim(), alt);
    resetImageDialog();
  };

  const insertImageMarkdown = (url: string, alt: string) => {
    const markdown = `\n![${alt}](${url}){:align="${imageAlignment}"}\n`;
    insertText(markdown);
  };

  const resetImageDialog = () => {
    setShowImageDialog(false);
    setImageUrlInput('');
    setImageAltText('');
    setImageAlignment('center');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const alignmentOptions: { value: typeof imageAlignment; icon: React.ElementType; label: string }[] = [
    { value: 'left', icon: AlignLeft, label: 'ชิดซ้าย' },
    { value: 'center', icon: AlignCenter, label: 'กึ่งกลาง' },
    { value: 'right', icon: AlignRight, label: 'ชิดขวา' },
    { value: 'full', icon: Maximize2, label: 'เต็มความกว้าง' },
  ];

  return (
    <div className="relative border border-slate-700/80 rounded-2xl bg-slate-900 overflow-hidden shadow-xl">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => insertText('\n# หัวข้อหลักใหม่\n')}
            className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg flex items-center gap-1"
            title="เพิ่มหัวข้อหลัก"
          >
            <Heading className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Heading</span>
          </button>
          <button
            type="button"
            onClick={() => insertText('**ข้อความตัวหนา**')}
            className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg"
            title="ตัวหนา"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*ข้อความตัวเอียง*')}
            className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg"
            title="ตัวเอียง"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('\n- รายการย่อย 1\n- รายการย่อย 2\n')}
            className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg"
            title="รายการ bullet"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenLinkDialog}
            className="p-2 text-sky-300 hover:bg-slate-700 rounded-lg flex items-center gap-1"
            title="แทรกลิงก์"
          >
            <Link className="w-4 h-4 text-sky-400" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => slashCommands[0].action()}
            className="px-2.5 py-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Callout Warning
          </button>
          <button
            type="button"
            onClick={() => slashCommands[2].action()}
            className="px-2.5 py-1 text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <Video className="w-3.5 h-3.5" /> YouTube Embed
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => setShowImageDialog(true)}
            className="px-2.5 py-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <Image className="w-3.5 h-3.5" /> Insert Image
          </button>
        </div>

        {onOpenAICopilot && (
          <button
            type="button"
            onClick={onOpenAICopilot}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Writing Copilot
          </button>
        )}
      </div>

      {/* Floating Slash Command Menu (Requirement 2: Slash Commands) */}
      {showSlashMenu && (
        <div className="absolute left-6 top-16 z-30 w-80 bg-slate-800 border border-indigo-500/40 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Slash Commands Menu
          </div>
          <div className="space-y-1 mt-1">
            {slashCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={cmd.action}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-indigo-600/30 hover:border-indigo-500/30 border border-transparent transition-all flex items-start gap-3 group"
                >
                  <div className="p-2 bg-slate-700/80 group-hover:bg-indigo-600 group-hover:text-white text-indigo-400 rounded-lg mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200 group-hover:text-white">{cmd.label}</h5>
                    <p className="text-[11px] text-slate-400 leading-tight">{cmd.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Textarea Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder="พิมพ์เนื้อหา SOP ที่นี่... (เคล็ดลับ: พิมพ์ / เพื่อเรียกเมนูทางลัด Slash Command เช่น /callout หรือ /ai)"
        rows={18}
        className="w-full p-5 bg-transparent text-slate-100 placeholder-slate-400 font-mono text-sm leading-relaxed focus:outline-none resize-y"
      />

      {/* Link Insert Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowLinkDialog(false)}>
          <div
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">แทรกไฮเปอร์ลิงก์ (Insert Link)</h3>
                  <p className="text-xs text-slate-400">สร้างลิงก์เชื่อมโยงไปยัง URL ภายนอกหรือเอกสาร</p>
                </div>
              </div>
              <button onClick={() => setShowLinkDialog(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" /> URL ปลายทาง (Link URL):
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInsertLink(); } }}
                  placeholder="https://example.com/document หรือ /sops/1"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" /> ข้อความที่แสดง (Display Text):
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInsertLink(); } }}
                  placeholder="คลิกที่นี่เพื่อดูรายละเอียดเพิ่มเติม"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">💡 ถ้าเลือกข้อความในเอดิเตอร์ไว้ก่อนแล้ว ข้อความนั้นจะถูกนำมาใส่ในช่องนี้โดยอัตโนมัติ</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                <Link className="w-3.5 h-3.5" />
                <span>แทรกลิงก์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload/Insert Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={resetImageDialog}>
          <div
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">แทรกรูปภาพ (Insert Image)</h3>
                  <p className="text-xs text-slate-400">อัปโหลดหรือวาง URL รูปภาพ และปรับตำแหน่งตามต้องการ</p>
                </div>
              </div>
              <button onClick={resetImageDialog} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4">
              {/* Alignment Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">ตำแหน่งการวางรูปภาพ (Alignment):</label>
                <div className="grid grid-cols-4 gap-2">
                  {alignmentOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = imageAlignment === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setImageAlignment(opt.value)}
                        className={`p-3 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 border transition-all ${
                          isActive
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                            : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alt Text */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">คำอธิบายรูปภาพ (Alt Text):</label>
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  placeholder="เช่น แผนผังขั้นตอนการอนุมัติ..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tab: Upload vs URL */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <span className="h-px flex-1 bg-slate-800" />
                  <span>อัปโหลดไฟล์</span>
                  <span className="h-px flex-1 bg-slate-800" />
                </div>

                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-800 hover:bg-slate-800/80 transition-all text-center p-4 group">
                  <Image className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform mb-2" />
                  <p className="text-xs font-semibold text-slate-300">คลิกเพื่อเลือกรูปภาพจากเครื่อง</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, GIF, WebP, SVG (สูงสุด 10MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <span className="h-px flex-1 bg-slate-800" />
                  <span>หรือวาง URL</span>
                  <span className="h-px flex-1 bg-slate-800" />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleImageUrlInsert}
                    disabled={!imageUrlInput.trim() || isUploading}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>แทรก</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={resetImageDialog}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
        <span>รองรับรูปแบบ Markdown, Callouts, YouTube embeds, รูปภาพ และ Slash Commands</span>
        <span>{value.length} ตัวอักษร</span>
      </div>
    </div>
  );
}
