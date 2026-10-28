'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Share2,
  Calendar,
  User,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  ShoppingBag,
  Palette,
  MessageCircle,
} from 'lucide-react';

interface OrderItem {
  id: string;
  order_no: string;
  product_name: string;
  customer_name: string;
  price: number;
  images: string[];
  notes?: string;
  order_date: string;
  created_at: string;
}

export default function PublicOrdersCataloguePage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_images'>('all');

  // Lightbox Modal state
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Copied link toast state
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchCatalogue();
  }, []);

  const fetchCatalogue = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/resin/public/catalogue');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Failed to load catalogue:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterType === 'with_images') {
        return matchesSearch && item.images && item.images.length > 0;
      }
      return matchesSearch;
    });
  }, [orders, searchTerm, filterType]);

  const handleShareCatalogue = async () => {
    if (typeof window !== 'undefined') {
      try {
        if (navigator.share) {
          await navigator.share({
            title: 'Devangi Resin Studio Product Catalogue',
            text: 'Explore handcrafted resin artworks and custom creations by Devangi Resin Studio.',
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        }
      } catch {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  const openLightbox = (order: OrderItem, imgIdx = 0) => {
    setSelectedOrder(order);
    setActiveImageIndex(imgIdx);
  };

  const closeLightbox = () => {
    setSelectedOrder(null);
    setActiveImageIndex(0);
  };

  const nextImage = () => {
    if (!selectedOrder || !selectedOrder.images.length) return;
    setActiveImageIndex(prev => (prev + 1) % selectedOrder.images.length);
  };

  const prevImage = () => {
    if (!selectedOrder || !selectedOrder.images.length) return;
    setActiveImageIndex(prev => (prev - 1 + selectedOrder.images.length) % selectedOrder.images.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/70 via-pink-50/30 to-amber-50/30 text-slate-800 font-sans selection:bg-rose-200">
      {/* Top Banner / Navigation - Optimized for Mobile & Desktop */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-rose-100/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Logo + Brand Name */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/drs_logo/resin_logo.png"
                alt="Devangi Resin Studio"
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 font-serif leading-none truncate">
                Devangi Resin Studio
              </h1>
              <p className="text-[9px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest text-rose-600 font-bold mt-1 leading-none truncate">
                Product Catalogue &amp; Bespoke Art
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href="https://wa.me/919967313355"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Chat on WhatsApp (+91 99673 13355)"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">WhatsApp</span>
            </a>
            <button
              onClick={handleShareCatalogue}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Share catalogue"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <div className="relative overflow-hidden pt-6 sm:pt-10 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-800 text-[11px] sm:text-xs font-semibold mb-3 shadow-xs">
          <Palette className="w-3.5 h-3.5 text-rose-600" />
          <span>Handcrafted Luxury Resin Preservations &amp; Custom Art</span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-serif leading-tight">
          Devangi Resin Studio <br className="hidden xs:inline" />
          <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
            Product Catalogue
          </span>
        </h2>

        <p className="mt-3 sm:mt-4 text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
          Explore our collection of bespoke floral preservation clocks, ocean tables, personalized nameplates,
          keepsake art, and artisan decor. Each piece is custom-made with crystal-clear resin and floral accents.
        </p>

        {/* Search & Filter Bar - Mobile Friendly Stack/Row */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 max-w-2xl mx-auto">
          <div className="relative w-full">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, customer, or DRSIN26..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-11 pr-9 py-2.5 sm:py-3 bg-white rounded-2xl border border-rose-200 shadow-xs text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-rose-200 shadow-xs w-full sm:w-auto shrink-0 justify-center">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('with_images')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'with_images'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              With Photos ({orders.filter(o => o.images && o.images.length > 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pb-20 sm:pb-24">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center animate-spin shadow-md shadow-rose-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 tracking-wide">
              Loading Devangi Resin Studio Catalogue...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 sm:p-12 text-center border border-rose-100 max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3 sm:mb-4">
              <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'Try adjusting your search criteria.' : 'New resin creations will appear here soon.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredOrders.map(order => {
              const hasImages = order.images && order.images.length > 0;
              const primaryImage = hasImages ? order.images[0] : null;

              return (
                <div
                  key={order.id}
                  className="group bg-white rounded-3xl border border-rose-100/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-rose-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative aspect-[4/3] bg-gradient-to-tr from-rose-100/60 via-pink-50 to-amber-50 overflow-hidden">
                      {primaryImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImage}
                          alt={order.product_name}
                          onClick={() => openLightbox(order, 0)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/drs_logo/resin_logo.png"
                            alt="Devangi Resin Studio"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-xs opacity-90 mb-2 transition-transform group-hover:scale-110 duration-300"
                          />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 font-serif">
                            Devangi Resin Studio
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Handcrafted Bespoke Piece</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider shadow-sm">
                          {order.order_no}
                        </span>
                      </div>

                      {hasImages && (
                        <div className="absolute bottom-2.5 right-2.5">
                          <button
                            onClick={() => openLightbox(order, 0)}
                            className="px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 text-[10px] sm:text-[11px] font-bold shadow-sm hover:bg-white flex items-center gap-1.5 transition-all"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>{order.images.length} Photo{order.images.length > 1 ? 's' : ''}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Image Thumbnails strip if multiple */}
                    {hasImages && order.images.length > 1 && (
                      <div className="px-3.5 sm:px-4 pt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
                        {order.images.slice(0, 4).map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => openLightbox(order, idx)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-rose-200 hover:border-rose-500 shrink-0 relative transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        {order.images.length > 4 && (
                          <button
                            onClick={() => openLightbox(order, 4)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200 flex items-center justify-center shrink-0"
                          >
                            +{order.images.length - 4}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Content Area */}
                    <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-rose-600 mb-1">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Custom Creation for {order.customer_name}</span>
                        </div>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-rose-600 transition-colors leading-snug">
                          {order.product_name}
                        </h3>
                      </div>

                      {order.notes && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-rose-50/40 p-2 sm:p-2.5 rounded-xl border border-rose-100/60">
                          {order.notes}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <span className="text-slate-400 flex items-center gap-1 text-[10px] sm:text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          {order.order_date
                            ? new Date(order.order_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Bespoke Order'}
                        </span>
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Price
                          </span>
                          <span className="text-base sm:text-lg font-black text-rose-600">
                            ₹{Number(order.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Inquiry Button - Mobile Touch Optimized */}
                  <div className="p-3.5 sm:p-4 pt-0">
                    <a
                      href={`https://wa.me/919967313355?text=${encodeURIComponent(
                        `Hi Devangi Resin Studio! I am interested in your custom order "${order.product_name}" (Order No: ${order.order_no}) from your product catalogue.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[42px] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Inquire About Similar Piece</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox / Gallery Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in">
          {/* Top Bar */}
          <div className="p-3 sm:p-4 flex items-center justify-between text-white border-b border-white/10 gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-sm sm:text-base truncate">{selectedOrder.product_name}</h4>
              <p className="text-[11px] sm:text-xs text-rose-300 truncate">
                {selectedOrder.order_no} • Custom for {selectedOrder.customer_name} • ₹
                {Number(selectedOrder.price).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/919967313355?text=${encodeURIComponent(
                  `Hi Devangi Resin Studio! I am interested in your custom order "${selectedOrder.product_name}" (Order No: ${selectedOrder.order_no}) from your product catalogue.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inquire on WhatsApp</span>
                <span className="sm:inline">Inquire</span>
              </a>
              <button
                onClick={closeLightbox}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                title="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Main Photo View */}
          <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4">
            {selectedOrder.images && selectedOrder.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedOrder.images[activeImageIndex]}
                alt={`${selectedOrder.product_name} image ${activeImageIndex + 1}`}
                className="max-h-[70vh] sm:max-h-[75vh] max-w-[92vw] sm:max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-all duration-300"
              />
            ) : (
              <p className="text-white/60 text-xs sm:text-sm">No image available for this order.</p>
            )}

            {/* Prev / Next buttons if multiple */}
            {selectedOrder.images && selectedOrder.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 transition-all active:scale-95"
                  title="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 transition-all active:scale-95"
                  title="Next image"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {selectedOrder.images && selectedOrder.images.length > 1 && (
            <div className="p-3 sm:p-4 border-t border-white/10 flex justify-center gap-2 overflow-x-auto bg-black/40">
              {selectedOrder.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImageIndex === idx ? 'border-rose-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-rose-100 py-8 sm:py-10 px-4 text-center">
        <div className="max-w-md mx-auto space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drs_logo/resin_logo.png"
            alt="Devangi Resin Studio Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain mx-auto filter drop-shadow-xs"
          />
          <div className="text-rose-600 font-serif font-black text-base sm:text-lg">
            Devangi Resin Studio
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed px-4">
            Handcrafted luxury resin decor, custom preservation, floral keepsakes &amp; personalized art.
            Designed and created with passion.
          </p>
          <div className="pt-2">
            <a
              href={`https://wa.me/919967313355?text=${encodeURIComponent(
                'Hi Devangi Resin Studio! I was browsing your product catalogue and would like to inquire about bespoke resin orders.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp (+91 99673 13355)</span>
            </a>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            © {new Date().getFullYear()} Devangi Resin Studio. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
