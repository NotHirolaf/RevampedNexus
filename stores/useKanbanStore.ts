import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { KanbanBoard, KanbanCard, KanbanColumn } from "@/types";

interface KanbanState {
  boards: KanbanBoard[];
  activeBoardId: string | null;

  setActiveBoard: (id: string | null) => void;

  addBoard: (name: string) => string;
  renameBoard: (id: string, name: string) => void;
  removeBoard: (id: string) => void;

  addColumn: (boardId: string, name: string) => void;
  renameColumn: (boardId: string, columnId: string, name: string) => void;
  removeColumn: (boardId: string, columnId: string) => void;
  reorderColumns: (boardId: string, orderedIds: string[]) => void;

  addCard: (boardId: string, columnId: string, card: KanbanCard) => void;
  updateCard: (
    boardId: string,
    columnId: string,
    cardId: string,
    partial: Partial<KanbanCard>
  ) => void;
  removeCard: (boardId: string, columnId: string, cardId: string) => void;

  moveCard: (
    boardId: string,
    fromColumnId: string,
    toColumnId: string,
    cardId: string,
    toIndex: number
  ) => void;

  reorderCards: (
    boardId: string,
    columnId: string,
    orderedIds: string[]
  ) => void;

  setBoards: (boards: KanbanBoard[]) => void;
}

const DEFAULT_COLUMN_NAMES = ["To Do", "In Progress", "Review", "Done"];

function makeColumn(name: string): KanbanColumn {
  return {
    id: crypto.randomUUID(),
    name,
    cards: [],
  };
}

function withBoard(
  boards: KanbanBoard[],
  boardId: string,
  mapper: (b: KanbanBoard) => KanbanBoard
): KanbanBoard[] {
  return boards.map((b) => (b.id === boardId ? mapper(b) : b));
}

function withColumn(
  board: KanbanBoard,
  columnId: string,
  mapper: (c: KanbanColumn) => KanbanColumn
): KanbanBoard {
  return {
    ...board,
    columns: board.columns.map((c) => (c.id === columnId ? mapper(c) : c)),
  };
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      boards: [],
      activeBoardId: null,

      setActiveBoard: (id) => set({ activeBoardId: id }),

      addBoard: (name) => {
        const board: KanbanBoard = {
          id: crypto.randomUUID(),
          name,
          columns: DEFAULT_COLUMN_NAMES.map(makeColumn),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          boards: [...state.boards, board],
          activeBoardId: board.id,
        }));
        return board.id;
      },

      renameBoard: (id, name) =>
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === id ? { ...b, name } : b
          ),
        })),

      removeBoard: (id) =>
        set((state) => {
          const next = state.boards.filter((b) => b.id !== id);
          const activeBoardId =
            state.activeBoardId === id
              ? next[0]?.id ?? null
              : state.activeBoardId;
          return { boards: next, activeBoardId };
        }),

      addColumn: (boardId, name) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) => ({
            ...b,
            columns: [...b.columns, makeColumn(name)],
          })),
        })),

      renameColumn: (boardId, columnId, name) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) =>
            withColumn(b, columnId, (c) => ({ ...c, name }))
          ),
        })),

      removeColumn: (boardId, columnId) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) => ({
            ...b,
            columns: b.columns.filter((c) => c.id !== columnId),
          })),
        })),

      reorderColumns: (boardId, orderedIds) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) => {
            const map = new Map(b.columns.map((c) => [c.id, c]));
            const next: KanbanColumn[] = [];
            for (const id of orderedIds) {
              const c = map.get(id);
              if (c) {
                next.push(c);
                map.delete(id);
              }
            }
            for (const c of map.values()) next.push(c);
            return { ...b, columns: next };
          }),
        })),

      addCard: (boardId, columnId, card) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) =>
            withColumn(b, columnId, (c) => ({
              ...c,
              cards: [...c.cards, card],
            }))
          ),
        })),

      updateCard: (boardId, columnId, cardId, partial) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) =>
            withColumn(b, columnId, (c) => ({
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId ? { ...card, ...partial } : card
              ),
            }))
          ),
        })),

      removeCard: (boardId, columnId, cardId) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) =>
            withColumn(b, columnId, (c) => ({
              ...c,
              cards: c.cards.filter((card) => card.id !== cardId),
            }))
          ),
        })),

      moveCard: (boardId, fromColumnId, toColumnId, cardId, toIndex) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) => {
            let movedCard: KanbanCard | undefined;
            const cols = b.columns.map((c) => {
              if (c.id === fromColumnId) {
                const idx = c.cards.findIndex((card) => card.id === cardId);
                if (idx === -1) return c;
                movedCard = c.cards[idx];
                return {
                  ...c,
                  cards: c.cards.filter((card) => card.id !== cardId),
                };
              }
              return c;
            });
            if (!movedCard) return b;
            const next = cols.map((c) => {
              if (c.id === toColumnId) {
                const cards = [...c.cards];
                const insertAt = Math.max(0, Math.min(toIndex, cards.length));
                cards.splice(insertAt, 0, movedCard!);
                return { ...c, cards };
              }
              return c;
            });
            return { ...b, columns: next };
          }),
        })),

      reorderCards: (boardId, columnId, orderedIds) =>
        set((state) => ({
          boards: withBoard(state.boards, boardId, (b) =>
            withColumn(b, columnId, (c) => {
              const map = new Map(c.cards.map((card) => [card.id, card]));
              const next: KanbanCard[] = [];
              for (const id of orderedIds) {
                const card = map.get(id);
                if (card) {
                  next.push(card);
                  map.delete(id);
                }
              }
              for (const card of map.values()) next.push(card);
              return { ...c, cards: next };
            })
          ),
        })),

      setBoards: (boards) => {
        const current = get().activeBoardId;
        const stillExists = boards.find((b) => b.id === current);
        set({
          boards,
          activeBoardId: stillExists ? current : boards[0]?.id ?? null,
        });
      },
    }),
    { name: "nexus:kanban" }
  )
);
