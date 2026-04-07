import { Keyboard, Mouse, X } from "lucide-react"

const InformationCard = ({ setHelpOpen }: { setHelpOpen: (open: boolean) => void }) => {
    return (
        <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 " onClick={() => setHelpOpen(false)}>
            <div
                style={{
                    scrollbarWidth: "none"
                }}
                className="relative w-120 max-h-[80vh] overflow-y-auto rounded-2xl bg-toolbar-bg border border-border shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={() => setHelpOpen(false)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-all"
                >
                    <X size={18} />
                </button>

                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Keyboard size={20} /> Keyboard Shortcuts
                </h2>

                <div className="space-y-1 text-sm">
                    {[
                        ["V", "Select tool"],
                        ["H", "Hand / Pan"],
                        ["P", "Pencil / Draw"],
                        ["L", "Line"],
                        ["A", "Arrow"],
                        ["R", "Rectangle"],
                        ["O", "Ellipse"],
                        ["D", "Diamond"],
                        ["T", "Text"],
                        ["E", "Eraser"],
                    ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                            <span className="text-muted-foreground">{desc}</span>
                            <kbd className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-medium border border-border">{key}</kbd>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Actions</h3>
                    {[
                        ["Ctrl + Z", "Undo"],
                        ["Ctrl + Shift + Z", "Redo"],
                        ["Ctrl + C", "Copy selected"],
                        ["Ctrl + V", "Paste"],
                        ["Ctrl + D", "Duplicate selected"],
                        ["Delete / Backspace", "Delete selected"],
                        ["Enter", "Commit text"],
                        ["Shift + Enter", "New line in text"],
                        ["Escape", "Cancel text editing"],
                    ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                            <span className="text-muted-foreground">{desc}</span>
                            <kbd className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-medium border border-border">{key}</kbd>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Mouse size={16} /> Mouse & Interactions
                    </h3>
                    {[
                        ["Scroll wheel", "Zoom in / out"],
                        ["Click + Drag", "Draw or move elements"],
                        ["Double-click text", "Edit existing text"],
                        ["Select + Drag handles", "Resize elements"],
                        ["Hand tool + Drag", "Pan the canvas"],
                        ["Image button", "Upload & add image"],
                        ["Crop In / Reset", "Crop selected image"],
                    ].map(([action, desc]) => (
                        <div key={action} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                            <span className="text-muted-foreground">{desc}</span>
                            <span className="text-xs text-foreground font-medium">{action}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default InformationCard