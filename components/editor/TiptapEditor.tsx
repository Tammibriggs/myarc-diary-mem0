'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { createPortal } from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    ImageIcon,
    Smile,
    Undo,
    Redo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

const MenuBar = ({ editor, position }: { editor: any; position: 'top' | 'bottom' }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!editor) {
        return null;
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file size (3MB)
        if (file.size > 3 * 1024 * 1024) {
            alert('Image must be less than 3MB');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post('/api/upload', formData);
            editor.chain().focus().setImage({ src: data.url }).run();
        } catch (error) {
            console.error('Image upload failed:', error);
            // Fallback to base64 if upload fails
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    editor.chain().focus().setImage({ src: result }).run();
                }
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploading(false);
            // Reset input so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addImage = () => {
        fileInputRef.current?.click();
    };

    const onEmojiClick = (emojiData: any) => {
        editor.chain().focus().insertContent(emojiData.emoji).run();
        setShowEmojiPicker(false);
    };

    const isBottom = position === 'bottom';

    return (
        <div className={cn(
            "flex flex-wrap items-center gap-1 p-2 bg-black/5 rounded-2xl border border-black/5 [&_button]:cursor-pointer",
            isBottom ? "mb-0 mt-2" : "mb-4 mt-0"
        )}>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={cn("w-10 h-10 rounded-xl", editor.isActive('bold') && 'bg-primary/20 text-primary')}
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={cn("w-10 h-10 rounded-xl", editor.isActive('italic') && 'bg-primary/20 text-primary')}
            >
                <Italic className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-black/10 mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("w-10 h-10 rounded-xl", editor.isActive('bulletList') && 'bg-primary/20 text-primary')}
            >
                <List className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("w-10 h-10 rounded-xl", editor.isActive('orderedList') && 'bg-primary/20 text-primary')}
            >
                <ListOrdered className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-black/10 mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={addImage}
                disabled={isUploading}
                className={cn("w-10 h-10 rounded-xl", isUploading && "opacity-50")}
            >
                <ImageIcon className="w-4 h-4" />
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            <div className="relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn("w-10 h-10 rounded-xl", showEmojiPicker && 'bg-primary/20 text-primary')}
                >
                    <Smile className="w-4 h-4" />
                </Button>
                {showEmojiPicker && (
                    <div className={cn(
                        "fixed inset-0 z-50 flex items-end justify-center pb-16",
                        "sm:absolute sm:inset-auto sm:pb-0 sm:mt-2",
                        isBottom
                            ? "sm:bottom-full sm:left-0 sm:mb-2 sm:mt-0"
                            : "sm:top-full sm:left-0"
                    )}>
                        <div className="fixed inset-0 bg-black/20 sm:bg-transparent" onClick={() => setShowEmojiPicker(false)} />
                        <div className="relative z-50">
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                width={350}
                                height={400}
                                style={{ maxWidth: '90vw', maxHeight: 'calc(100vh - 120px)' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-black/10 mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="w-10 h-10 rounded-xl"
            >
                <Undo className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="w-10 h-10 rounded-xl"
            >
                <Redo className="w-4 h-4" />
            </Button>
        </div>
    );
};

export const TiptapEditor = ({ content, onChange, placeholder }: TiptapEditorProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image,
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none h-full flex-1 font-serif leading-relaxed prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2',
            },
        },
    });

    // Sync external content changes back to the editor
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="w-full flex flex-col flex-1 md:max-h-[60vh]">
            {/* Desktop: menu bar at top */}
            <div className="hidden md:block shrink-0">
                <MenuBar editor={editor} position="top" />
            </div>

            <EditorContent editor={editor} className="flex-1 min-h-0 overflow-y-auto flex flex-col pb-20 md:pb-0" />

            {/* Mobile: menu bar portaled to body so it escapes any transformed ancestor */}
            {mounted && createPortal(
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/5 p-2 md:hidden safe-bottom">
                    <MenuBar editor={editor} position="bottom" />
                </div>,
                document.body
            )}
        </div>
    );
};
