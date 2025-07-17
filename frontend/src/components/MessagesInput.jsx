import React, { useRef, useState } from 'react'
import { useChatStore } from '../store/useChatStore';
import { Image, Send, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useEffect } from 'react';

const MessagesInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);
    const { sendMessage } = useChatStore();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const emojiButtonRef = useRef(null);

    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleClickOutside = (event) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const addEmoji = (emojiData) => {
        const emojiChar = emojiData.emoji;
        if (inputRef.current) {
            const start = inputRef.current.selectionStart;
            const end = inputRef.current.selectionEnd;
            const newText = text.slice(0, start) + emojiChar + text.slice(end);
            setText(newText);
            setTimeout(() => {
                inputRef.current.focus();
                inputRef.current.selectionStart = inputRef.current.selectionEnd = start + emojiChar.length;
            }, 0);
        } else {
            setText(text + emojiChar);
        }
        setShowEmojiPicker(false);
    };
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview) return;

        try {
            await sendMessage({
                text: text.trim(),
                image: imagePreview,
            });

            // Clear form
            setText("");
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <div className='p-4 w-full'>
            {imagePreview && (
                <div className="mb-3 flex items-center gap-2">
                    <div className="relative">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
                              flex items-center justify-center"
                            type="button"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        className="w-full input input-bordered rounded-lg input-sm sm:input-md"
                        placeholder="Type a message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button
                        type="button"
                        className="btn btn-circle btn-ghost"
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        tabIndex={-1}
                        ref={emojiButtonRef}
                    >
                        <span role="img" aria-label="emoji">😊</span>
                    </button>
                    {showEmojiPicker && (
                        <div
                            className="absolute bottom-12 right-20 z-50"
                            ref={emojiPickerRef}
                        >
                            <EmojiPicker onEmojiClick={addEmoji} theme="auto" />
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                    />

                    <button
                        type="button"
                        className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image size={20} />
                    </button>
                </div>
                <button
                    type="submit"
                    className="btn btn-sm btn-circle"
                    disabled={!text.trim() && !imagePreview}
                >
                    <Send size={22} />
                </button>
            </form>
        </div>
    )
}

export default MessagesInput