interface Props {
  board: (string | null)[];
  onCellClick: (pos: number) => void;
  disabled?: boolean;
}

export default function Board({ board, onCellClick, disabled = false }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 p-2 bg-black/30 rounded-2xl shadow-lg">
      {board.map((cell, i) => (
        <button
          key={i}
          onClick={() => {
            if (disabled || cell) return;
            onCellClick(i);
          }}
          disabled={disabled || !!cell}
          className={`
            w-24 h-24 text-5xl font-extrabold
            flex items-center justify-center
            rounded-xl
            transition-all duration-200
            ${
              cell
                ? 'bg-white/10 text-white shadow-inner'
                : 'bg-white/5 hover:bg-white/20 text-white shadow-md'
            }
            ${disabled || cell ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
          `}
        >
          {cell || ""}
        </button>
      ))}
    </div>
  );
}
