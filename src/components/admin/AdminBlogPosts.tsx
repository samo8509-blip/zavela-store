import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  Calendar, 
  User, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';
import { StoreSettings, BlogPost } from '../../types/index.ts';

interface AdminBlogPostsProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminBlogPosts: React.FC<AdminBlogPostsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [posts, setPosts] = useState<BlogPost[]>(
    settings.blogPosts || [
      {
        id: 'post-1',
        title: 'Guía de Compra: Cómo Funciona el Pago Contra Entrega en Zavela Store',
        slug: 'como-funciona-pago-contra-entrega-colombia',
        excerpt: 'Aprende paso a paso cómo ordenar tus productos favoritos y pagar en efectivo directamente al repartidor en tu puerta.',
        content: 'El pago contra entrega es la forma más segura y confiable de comprar por internet en Colombia. En Zavela Store despachamos a través de Servientrega, Coordinadora y Envía...',
        coverImage: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&auto=format&fit=crop&q=80',
        author: 'Equipo Zavela',
        publishedAt: '2025-01-15',
        readTime: '3 min de lectura',
        active: true
      },
      {
        id: 'post-2',
        title: 'Top 5 Gadgets de Tecnología Indispensables para tu Hogar este Año',
        slug: 'top-gadgets-tecnologia-hogar-colombia',
        excerpt: 'Descubre los dispositivos inteligentes que te ahorrarán tiempo, energía y elevarán el confort de tus espacios.',
        content: 'La domótica y los accesorios inteligentes ya no son un lujo. Conoce nuestra selección de gadgets con garantía oficial...',
        coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        author: 'Redacción Tech Zavela',
        publishedAt: '2025-02-01',
        readTime: '4 min de lectura',
        active: true
      }
    ]
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [form, setForm] = useState<Partial<BlogPost>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&auto=format&fit=crop&q=80',
    author: 'Equipo Zavela',
    readTime: '3 min',
    active: true
  });

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      setPosts(posts.map(p => p.id === editingPost.id ? editingPost : p));
      setEditingPost(null);
    } else {
      const newP: BlogPost = {
        id: `post-${Date.now()}`,
        title: form.title || 'Nuevo Artículo',
        slug: form.slug || (form.title ? form.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : `post-${Date.now()}`),
        excerpt: form.excerpt || '',
        content: form.content || '',
        coverImage: form.coverImage || 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&auto=format&fit=crop&q=80',
        author: form.author || 'Equipo Zavela',
        publishedAt: new Date().toISOString().slice(0, 10),
        readTime: form.readTime || '3 min',
        active: form.active !== false
      };
      setPosts([newP, ...posts]);
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta publicación del blog?')) return;
    setPosts(posts.filter(p => p.id !== id));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        blogPosts: posts
      });
      alert('Publicaciones del blog guardadas correctamente.');
    } catch (err: any) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 4: CUERPO DE LA TIENDA
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Publicaciones y Blog de Zavela Store
          </h2>
          <p className="text-xs text-slate-500">
            Crea artículos educativos, guías de compra sobre pago contra entrega y reseñas de productos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setForm({
                title: '',
                slug: '',
                excerpt: '',
                content: '',
                coverImage: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&auto=format&fit=crop&q=80',
                author: 'Equipo Zavela',
                readTime: '3 min',
                active: true
              });
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Artículo</span>
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-44 bg-slate-100 relative">
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  post.active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {post.active ? 'Publicado' : 'Borrador'}
                </span>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{post.publishedAt}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                  <span>•</span>
                  <span>Por {post.author}</span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                  {post.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100">
              <button
                onClick={() => setEditingPost(post)}
                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                title="Editar artículo"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(post.id)}
                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                title="Eliminar artículo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isCreating || editingPost) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingPost ? 'Modificar Artículo del Blog' : 'Redactar Nueva Publicación'}
              </h3>
              <button
                onClick={() => { setIsCreating(false); setEditingPost(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título del Artículo *</label>
                <input
                  type="text"
                  required
                  value={editingPost ? editingPost.title : form.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    const slugVal = val.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    if (editingPost) {
                      setEditingPost({ ...editingPost, title: val, slug: editingPost.slug || slugVal });
                    } else {
                      setForm({ ...form, title: val, slug: slugVal });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resumen Breve (Excerpt)</label>
                <textarea
                  rows={2}
                  value={editingPost ? editingPost.excerpt : form.excerpt}
                  onChange={(e) => editingPost
                    ? setEditingPost({ ...editingPost, excerpt: e.target.value })
                    : setForm({ ...form, excerpt: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contenido Completo del Post</label>
                <textarea
                  rows={5}
                  required
                  value={editingPost ? editingPost.content : form.content}
                  onChange={(e) => editingPost
                    ? setEditingPost({ ...editingPost, content: e.target.value })
                    : setForm({ ...form, content: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Autor</label>
                  <input
                    type="text"
                    value={editingPost ? editingPost.author : form.author}
                    onChange={(e) => editingPost
                      ? setEditingPost({ ...editingPost, author: e.target.value })
                      : setForm({ ...form, author: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiempo de Lectura</label>
                  <input
                    type="text"
                    value={editingPost ? editingPost.readTime : form.readTime}
                    onChange={(e) => editingPost
                      ? setEditingPost({ ...editingPost, readTime: e.target.value })
                      : setForm({ ...form, readTime: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL de Imagen de Portada</label>
                <input
                  type="url"
                  value={editingPost ? editingPost.coverImage : form.coverImage}
                  onChange={(e) => editingPost
                    ? setEditingPost({ ...editingPost, coverImage: e.target.value })
                    : setForm({ ...form, coverImage: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingPost(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  Guardar Publicación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
