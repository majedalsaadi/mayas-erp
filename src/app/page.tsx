/**
 * Mayas ERP - Home Page
 * الصفحة الرئيسية
 */

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center p-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-blue-600 mb-4">
            منصة مياس
          </h1>
          <p className="text-2xl text-gray-600">
            للمحاسبة وإدارة قطع غيار السيارات
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🚀 المشروع جاهز للبناء
          </h2>

          <div className="space-y-4 text-right">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-green-500 text-2xl">✅</span>
              <div>
                <h3 className="font-semibold text-green-800">التخطيط والتوثيق</h3>
                <p className="text-green-600 text-sm">جميع المستندات جاهزة والوكلاء موثقون</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <span className="text-blue-500 text-2xl">📦</span>
              <div>
                <h3 className="font-semibold text-blue-800">قاعدة البيانات</h3>
                <p className="text-blue-600 text-sm">Schema شامل مع +30 جدول</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <span className="text-purple-500 text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold text-purple-800">14 وكيل AI</h3>
                <p className="text-purple-600 text-sm">كل وكيل جاهز للبدء في مهمته</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <span className="text-orange-500 text-2xl">⚙️</span>
              <div>
                <h3 className="font-semibold text-orange-800">البنية التحتية</h3>
                <p className="text-orange-600 text-sm">Next.js, Prisma, Supabase, OpenRouter</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">
              <strong>الخطوة التالية:</strong> تشغيل الوكلاء لبناء الموديولات
            </p>
          </div>
        </div>

        <div className="mt-8 text-gray-500 text-sm">
          <p>النسخة 0.1.0 | جميع الحقوق محفوظة © 2024 منصة مياس</p>
        </div>
      </div>
    </main>
  );
}
