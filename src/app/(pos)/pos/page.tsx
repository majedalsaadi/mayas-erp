/**
 * Mayas ERP - POS Page
 * صفحة نقاط البيع
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// أنواع البيانات
interface CartItem {
  id: string;
  itemId: string;
  code: string;
  nameAr: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  stock: number;
}

interface Customer {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone?: string;
  taxNumber?: string;
}

interface Terminal {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

interface Shift {
  id: string;
  shiftNo: string;
  openedAt: string;
  openingCash: number;
}

// مخطط التحقق
const paymentSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function POSPage() {
  const router = useRouter();
  
  // حالات المكون
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Termerminal | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'cash',
      amount: 0,
    },
  });

  // تحميل المحطات عند بدء التشغيل
  useEffect(() => {
    loadTerminals();
  }, []);

  // تحميل المحطات
  const loadTerminals = async () => {
    try {
      const response = await fetch('/api/pos/terminals');
      if (response.ok) {
        const data = await response.json();
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error('خطأ في تحميل المحطات:', error);
    }
  };

  // التحقق من الوردية الحالية
  const checkCurrentShift = async (terminalId: string) => {
    try {
      const response = await fetch(`/api/pos/shift/current?terminalId=${terminalId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.shift) {
          setCurrentShift(data.shift);
        } else {
          setShowShiftModal(true);
        }
      }
    } catch (error) {
      console.error('خطأ في التحقق من الوردية:', error);
    }
  };

  // اختيار المحطة
  const handleSelectTerminal = (terminal: Terminal) => {
    setSelectedTerminal(terminal);
    checkCurrentShift(terminal.id);
  };

  // فتح وردية جديدة
  const handleOpenShift = async (openingCash: number) => {
    if (!selectedTerminal) return;

    try {
      const response = await fetch('/api/pos/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          terminalId: selectedTerminal.id,
          openingCash,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentShift(data.shift);
        setShowShiftModal(false);
      }
    } catch (error) {
      console.error('خطأ في فتح الوردية:', error);
    }
  };

  // البحث عن أصناف
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/pos/items/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.items || []);
      }
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // تأخير البحث
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // إضافة صنف للسلة
  const addToCart = (item: any) => {
    const existingIndex = cart.findIndex((c) => c.itemId === item.id);

    if (existingIndex >= 0) {
      // زيادة الكمية
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += 1;
      updatedCart[existingIndex].lineTotal = calculateLineTotal(updatedCart[existingIndex]);
      setCart(updatedCart);
    } else {
      // إضافة صنف جديد
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        itemId: item.id,
        code: item.code,
        nameAr: item.nameAr,
        qty: 1,
        unitPrice: item.price,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: item.price,
        stock: item.stock,
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  // حساب إجمالي البند
  const calculateLineTotal = (item: CartItem): number => {
    const subtotal = item.qty * item.unitPrice;
    const discount = item.discountAmount || (subtotal * item.discountPercent / 100);
    return subtotal - discount;
  };

  // تحديث كمية البند
  const updateItemQty = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].qty = qty;
    updatedCart[index].lineTotal = calculateLineTotal(updatedCart[index]);
    setCart(updatedCart);
  };

  // تحديث سعر البند
  const updateItemPrice = (index: number, price: number) => {
    const updatedCart = [...cart];
    updatedCart[index].unitPrice = price;
    updatedCart[index].lineTotal = calculateLineTotal(updatedCart[index]);
    setCart(updatedCart);
  };

  // حذف من السلة
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // حساب الإجماليات
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = discountAmount || (subtotal * discountPercent / 100);
    const total = subtotal - discount;

    return { subtotal, discount, total };
  };

  const { subtotal, discount, total } = calculateTotals();

  // معالجة الدفع
  const handlePayment = async (data: PaymentFormData) => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/pos/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: selectedTerminal?.id,
          customerId: customer?.id,
          items: cart.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          })),
          paymentMethod: data.paymentMethod,
          discountPercent,
          discountAmount,
          notes,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // إعادة تعيين السلة
        setCart([]);
        setCustomer(null);
        setDiscountPercent(0);
        setDiscountAmount(0);
        setNotes('');
        setShowPaymentModal(false);
        reset();

        // عرض الفاتورة أو الطباعة
        alert(`تم إنشاء الفاتورة بنجاح: ${result.invoice.invoiceNo}`);
      }
    } catch (error) {
      console.error('خطأ في معالجة الدفع:', error);
      alert('حدث خطأ في معالجة الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  // إغلاق الوردية
  const handleCloseShift = async () => {
    if (!currentShift) return;

    const actualCash = prompt('أدخل المبلغ الفعلي في الصندوق:');
    if (!actualCash) return;

    try {
      const response = await fetch('/api/pos/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          shiftId: currentShift.id,
          actualCash: parseFloat(actualCash),
        }),
      });

      if (response.ok) {
        setCurrentShift(null);
        setSelectedTerminal(null);
        setCart([]);
        alert('تم إغلاق الوردية بنجاح');
      }
    } catch (error) {
      console.error('خطأ في إغلاق الوردية:', error);
    }
  };

  // اختيار المحطة - واجهة
  if (!selectedTerminal) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">اختر المحطة</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map((terminal) => (
              <button
                key={terminal.id}
                onClick={() => handleSelectTerminal(terminal)}
                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-right"
              >
                <div className="text-xl font-semibold">{terminal.nameAr}</div>
                <div className="text-gray-500">{terminal.code}</div>
              </button>
            ))}
          </div>

          {terminals.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              لا توجد محطات متاحة
            </div>
          )}
        </div>
      </div>
    );
  }

  // فتح وردية - واجهة
  if (showShiftModal && !currentShift) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">فتح وردية جديدة</h2>
          <p className="text-gray-600 mb-4 text-center">
            المحطة: {selectedTerminal.nameAr}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const openingCash = parseFloat(formData.get('openingCash') as string) || 0;
              handleOpenShift(openingCash);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">
                رصيد الافتتاح
              </label>
              <input
                type="number"
                name="openingCash"
                step="0.01"
                defaultValue="0"
                className="w-full px-4 py-2 border rounded-lg text-right"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              فتح الوردية
            </button>
          </form>
        </div>
      </div>
    );
  }

  // الواجهة الرئيسية للـ POS
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* الهيدر */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{selectedTerminal.nameAr}</h1>
          <span className="text-gray-500">|</span>
          <span className="text-sm text-gray-600">
            الوردية: {currentShift?.shiftNo}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {customer && (
            <div className="text-sm">
              <span className="text-gray-500">العميل:</span>{' '}
              <span className="font-semibold">{customer.nameAr}</span>
            </div>
          )}

          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {customer ? 'تغيير العميل' : 'اختيار عميل'}
          </button>

          <button
            onClick={handleCloseShift}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            إغلاق الوردية
          </button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex">
        {/* قسم البحث والسلة */}
        <div className="flex-1 flex flex-col p-6">
          {/* البحث */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="بحث بالكود أو الاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg text-right text-lg"
              autoFocus
            />

            {/* نتائج البحث */}
            {searchResults.length > 0 && (
              <div className="absolute bg-white border rounded-lg shadow-lg mt-1 w-full max-w-md z-10">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="w-full px-4 py-3 text-right hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                  >
                    <div>
                      <div className="font-semibold">{item.nameAr}</div>
                      <div className="text-sm text-gray-500">{item.code}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-blue-600">
                        {item.price.toFixed(2)} ر.س
                      </div>
                      <div className="text-xs text-gray-500">
                        المخزون: {item.stock}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* السلة */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold">الصنف</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">الكمية</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">السعر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">الخصم</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">الإجمالي</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{item.nameAr}</div>
                      <div className="text-xs text-gray-500">{item.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItemQty(index, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-center"
                        min="0"
                        step="1"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded text-center"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) => {
                          const updatedCart = [...cart];
                          updatedCart[index].discountPercent = parseFloat(e.target.value) || 0;
                          updatedCart[index].lineTotal = calculateLineTotal(updatedCart[index]);
                          setCart(updatedCart);
                        }}
                        className="w-20 px-2 py-1 border rounded text-center"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      %
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {item.lineTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}

                {cart.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      السلة فارغة - ابدأ بإضافة أصناف
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ملاحظات */}
          <div className="mt-4">
            <textarea
              placeholder="ملاحظات..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* قسم الإجماليات والدفع */}
        <div className="w-80 bg-white shadow-lg p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-6">ملخص الفاتورة</h2>

          {/* الإجماليات */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">المجموع الفرعي:</span>
              <span className="font-semibold">{subtotal.toFixed(2)} ر.س</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">الخصم:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => {
                    const percent = parseFloat(e.target.value) || 0;
                    setDiscountPercent(percent);
                    setDiscountAmount(subtotal * percent / 100);
                  }}
                  className="w-16 px-2 py-1 border rounded text-center text-sm"
                  min="0"
                  max="100"
                />
                <span>%</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">خصم إضافي:</span>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  setDiscountAmount(amount);
                  setDiscountPercent(subtotal > 0 ? (amount / subtotal) * 100 : 0);
                }}
                className="w-24 px-2 py-1 border rounded text-center"
                min="0"
                step="0.01"
              />
            </div>

            <hr />

            <div className="flex justify-between text-xl font-bold">
              <span>الإجمالي:</span>
              <span className="text-blue-600">{total.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* أزرار الدفع */}
          <div className="space-y-3 mt-auto">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              دفع ({total.toFixed(2)} ر.س)
            </button>

            <button
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                setDiscountAmount(0);
                setNotes('');
              }}
              className="w-full py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              إلغاء الفاتورة
            </button>
          </div>
        </div>
      </div>

      {/* نافذة الدفع */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">الدفع</h2>

            <form onSubmit={handleSubmit(handlePayment)} className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600">
                  {total.toFixed(2)} ر.س
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  طريقة الدفع
                </label>
                <select
                  {...register('paymentMethod')}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="transfer">تحويل</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  المبلغ المدفوع
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={total}
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border rounded-lg text-center text-xl"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-300"
                >
                  {isProcessing ? 'جاري المعالجة...' : 'تأكيد الدفع'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    reset();
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة اختيار العميل */}
      {showCustomerModal && (
        <CustomerSearchModal
          onSelect={(selectedCustomer) => {
            setCustomer(selectedCustomer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}

// مكون البحث عن عميل
function CustomerSearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.customers || []);
        }
      } catch (error) {
        console.error('خطأ في البحث:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">اختيار عميل</h2>

        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg mb-4"
          autoFocus
        />

        <div className="max-h-64 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelect(customer)}
              className="w-full px-4 py-3 text-right hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-semibold">{customer.nameAr}</div>
              <div className="text-sm text-gray-500">{customer.phone}</div>
            </button>
          ))}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-gray-500 py-8">لا توجد نتائج</div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
