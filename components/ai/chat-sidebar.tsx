'use client';

import { useState, useCallback } from 'react';
import { useAIChat } from '@/contexts/ai-chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { ConversationSession } from '@/lib/ai/memory/episodic-memory';
import { dateUtils } from '@/lib/dates/dayjs';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  X, 
  Search,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sidebar para mostrar lista de chats/conversaciones
 * Responsive: drawer en mobile, sidebar fijo en desktop
 */
interface ChatSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({ isMobile = false, onClose }: ChatSidebarProps) {
  const {
    sessions,
    activeSessionId,
    isLoadingSessions,
    createNewChat,
    selectSession,
    deleteSession,
    renameSession,
  } = useAIChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Filtrar sesiones por búsqueda
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.title?.toLowerCase().includes(query) ||
      session.summary?.toLowerCase().includes(query) ||
      false
    );
  });

  // Iniciar edición de título
  const handleStartEdit = useCallback((session: ConversationSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title || '');
  }, []);

  // Guardar edición de título
  const handleSaveEdit = useCallback(async () => {
    if (!editingSessionId || !editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    await renameSession(editingSessionId, editTitle.trim());
    setEditingSessionId(null);
    setEditTitle('');
  }, [editingSessionId, editTitle, renameSession]);

  // Cancelar edición
  const handleCancelEdit = useCallback(() => {
    setEditingSessionId(null);
    setEditTitle('');
  }, []);

  // Confirmar eliminación
  const handleConfirmDelete = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    setDeletingSessionId(null);
  }, [deleteSession]);

  // Formatear fecha relativa
  const formatRelativeDate = (date: Date) => {
    return dateUtils.fromNow(date);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-r border-border',
        isMobile ? 'w-full' : 'w-64'
      )}
    >
      {/* Header con botón nuevo chat y búsqueda */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Botón nuevo chat */}
        <Button
          onClick={createNewChat}
          className="w-full"
          size="md"
          icon={<Plus className="h-4 w-4" />}
        >
          Nuevo chat
        </Button>

        {/* Búsqueda */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>

        {/* Botón cerrar en mobile */}
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full"
          >
            Cerrar
          </Button>
        )}
      </div>

      {/* Lista de sesiones */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex items-center justify-center p-8">
            <Loading size="sm" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {searchQuery ? (
              'No se encontraron conversaciones'
            ) : (
              <div className="space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-50" />
                <p>No hay conversaciones</p>
                <p className="text-xs">Crea una nueva para comenzar</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;
              const isDeleting = deletingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'group relative rounded-lg p-3 cursor-pointer transition-all',
                    'hover:bg-muted/50',
                    isActive
                      ? 'bg-primary/10 border border-primary/30 shadow-sm'
                      : 'border border-transparent'
                  )}
                  onClick={() => !isEditing && !isDeleting && selectSession(session.id)}
                >
                  {isEditing ? (
                    // Modo edición
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          className="flex-1 h-7"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="flex-1 h-7"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    // Modo confirmación eliminación
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-sm text-muted-foreground">
                        ¿Eliminar esta conversación?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleConfirmDelete(session.id)}
                          className="flex-1 h-7"
                        >
                          Eliminar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingSessionId(null)}
                          className="flex-1 h-7"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Vista normal
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {session.title || 'Chat sin título'}
                          </h3>
                          {session.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {session.summary}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeDate(session.lastMessageAt)}
                          </p>
                        </div>

                        {/* Botones de acción (aparecen en hover) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(session);
                            }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="Renombrar"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSessionId(session.id);
                            }}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>

                      {/* Indicador de mensajes */}
                      {session.messageCount > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {session.messageCount} mensaje{session.messageCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

