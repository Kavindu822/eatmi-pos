'use client';

import React from 'react';
import { ChefHat, Clock, CheckCircle2, Flame, Bell, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { Sale } from '@/lib/types';
import { playTapSound } from '@/lib/sound';

interface KitchenKdsProps {
  sales: Sale[];
  onUpdateStatus: (saleId: string, status: string) => Promise<void>;
  audioEnabled: boolean;
}

export default function KitchenKds({ sales, onUpdateStatus, audioEnabled }: KitchenKdsProps) {
  // Filter active today sales
  const activeOrders = sales.filter(s => s.status !== 'cancelled' && s.status !== 'completed').slice(0, 30);
  const completedOrders = sales.filter(s => s.status === 'completed').slice(0, 10);

  const handleStatusChange = async (saleId: string, nextStatus: string) => {
    playTapSound(audioEnabled);
    await onUpdateStatus(saleId, nextStatus);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-stone-900 text-stone-100 p-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-600/30 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-100">Live Kitchen Display (KDS)</h2>
            <p className="text-xs text-stone-400">Pastry Oven & Barista Station Orders</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800 border border-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-stone-300">
              {activeOrders.length} Active Tickets
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Kitchen Tickets */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 p-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-500/40 mb-3" />
            <h3 className="text-lg font-bold text-stone-300">Kitchen Counter Clear!</h3>
            <p className="text-xs text-stone-500 max-w-sm mt-1">
              All bakery items and drinks have been prepared and served to patrons.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {activeOrders.map(order => {
              let items: any[] = [];
              try {
                items = JSON.parse(order.items);
              } catch (e) {
                items = [];
              }

              const isPreparing = order.status === 'preparing';
              const isReady = order.status === 'ready';

              const orderTime = new Date(order.created).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });

              return (
                <div
                  key={order.id}
                  className={`flex flex-col rounded-2xl border transition-all shadow-lg overflow-hidden ${
                    isPreparing
                      ? 'bg-stone-950 border-amber-500/50 ring-1 ring-amber-500/20'
                      : 'bg-stone-950 border-emerald-500/50 ring-1 ring-emerald-500/20'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-3 flex items-center justify-between border-b ${
                      isPreparing
                        ? 'bg-amber-950/40 border-amber-900/60 text-amber-200'
                        : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tracking-wider">#{order.id}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-900/80 border border-stone-700">
                          {order.order_type === 'dine_in' ? `🍽️ ${order.table_no || 'Dine-In'}` : '🛍️ Takeaway'}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{orderTime}</span>
                        <span>·</span>
                        <span>{order.customer_name}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isPreparing ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                          <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" /> In Oven
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                          <Bell className="w-3.5 h-3.5 text-emerald-400" /> Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-3.5 flex-1 space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex items-start justify-between border-b border-stone-800/60 pb-2">
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-extrabold text-amber-400 text-sm mt-0.5">
                            {it.qty}x
                          </span>
                          <div>
                            <div className="font-semibold text-xs text-stone-100">{it.name}</div>
                            {it.modifiers && (
                              <div className="text-[10px] font-medium text-amber-300 bg-amber-950/60 border border-amber-900/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                🔥 {it.modifiers}
                              </div>
                            )}
                            {it.notes && (
                              <div className="text-[10px] text-stone-400 mt-0.5 italic">Note: {it.notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {order.notes && (
                      <div className="p-2 rounded-lg bg-stone-900 text-amber-300 text-[11px] font-medium border border-stone-800">
                        Instructions: {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="p-3 border-t border-stone-800/80 bg-stone-900/60">
                    {isPreparing ? (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Mark Ready for Pickup</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Handed to Patron (Complete)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

