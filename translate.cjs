const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const dictionary = {
  'لوحة التحكم': 'Dashboard',
  'لوحة تحكم الإدارة': 'Admin Dashboard',
  'العملاء': 'Customers',
  'العميل': 'Customer',
  'تنبيهات المخاطر': 'Risk Alerts',
  'التقارير': 'Reports',
  'لوحة الإدارة': 'Admin',
  'الإعدادات': 'Settings',
  'إجمالي العملاء': 'Total Customers',
  'في خطر': 'At Risk',
  'عالي الخطر': 'High Risk',
  'عالي': 'High',
  'متوسط': 'Medium',
  'منخفض': 'Low',
  'تحت المراقبة': 'Monitoring',
  'مستقر': 'Stable',
  'جديد': 'New',
  'بدأت مع العميل': 'Started',
  'في مرحلة المتابعة': 'Follow-up',
  'متابعة': 'Follow-up',
  'تم الحل': 'Resolved',
  'تغيير حالة العميل إلى:': 'Changed status to:',
  'تغيير الحالة إلى': 'Changed status to:',
  'تعيين الموظف المسؤول:': 'Assigned employee:',
  'تعيين الموظف': 'Assigned employee',
  'اسم العميل': 'Customer Name',
  'القطاع': 'Sector',
  'الخطة': 'Plan',
  'الإيراد الشهري': 'Monthly Revenue',
  'مستوى الخطر': 'Risk Level',
  'درجة الصحة': 'Health Score',
  'تاريخ التجديد': 'Renewal Date',
  'تاريخ الدخول': 'Last Login',
  'الموظف المسؤول': 'Assigned To',
  'الإجراءات': 'Actions',
  'تصدير للإكسيل': 'Export to Excel',
  'تصدير CSV': 'Export CSV',
  'إضافة عميل': 'Add Customer',
  'بحث باسم العميل، القطاع، الخطة...': 'Search by name, sector, plan...',
  'تصفية': 'Filter',
  'جميع المستويات': 'All Levels',
  'جميع الخطط': 'All Plans',
  'جميع القطاعات': 'All Sectors',
  'أقل إيراد (ر.س)': 'Min Revenue (SAR)',
  'أعلى إيراد (ر.س)': 'Max Revenue (SAR)',
  'إعادة ضبط الفلاتر': 'Reset Filters',
  'تحليل': 'Analyze',
  'تاريخ الموظفين المسؤولين': 'Assignment History',
  'ملاحظات آخر تواصل': 'Last Contact Notes',
  'أيام التواصل': 'Contact Days',
  'لا يوجد': 'None',
  'غير متوفر': 'N/A',
  'كسرة': 'Kesra',
  'رقم الهاتف': 'Phone Number',
  'رقم الموبايل': 'Phone Number',
  'اتجاه الأداء': 'Performance Trend',
  'العائد على الإنفاق (ROAS)': 'ROAS',
  'الحملات النشطة': 'Active Campaigns',
  'تراجع': 'Declining',
  'تحسن': 'Improving',
  'عدد الشكاوى / التذاكر': 'Support Tickets',
  'الاجتماعات (30 يوم)': 'Meetings (30d)',
  'تقييم آخر مكالمة': 'Last Call Rating',
  'بيانات الاستخدام والأداء': 'Usage & Performance',
  'سجل التواصل والدعم': 'Support History',
  'سجل نشاط العميل (Audit Log)': 'Customer Audit Log',
  'سجل الأنشطة': 'Activity Logs',
  'الإحصائيات': 'Statistics',
  'رفع البيانات': 'Upload Data',
  'رفع البيانات المركزية': 'Central Data Upload',
  'لا توجد أنشطة مسجلة حتى الآن.': 'No activities logged yet.',
  'بواسطة:': 'By:',
  'أداء الموظفين (Leaderboard)': 'Employee Leaderboard',
  'معدل الإنجاز': 'Completion Rate',
  'العملاء المستلمين': 'Assigned Customers',
  'تحديث جماعي:': 'Bulk Update:',
  'تم تحديد': 'Selected',
  'عميل': 'customer(s)',
  'تطبيق': 'Apply',
  'تغيير الحالة...': 'Change Status...',
  'حذف المحدد': 'Delete Selected',
  'إلغاء': 'Cancel',
  'حفظ العميل': 'Save Customer',
  'تعديل بيانات العميل': 'Edit Customer',
  'إضافة عميل جديد': 'Add New Customer',
  'أيام منذ آخر تفاعل': 'Days since last interaction',
  'آخر تفاعل': 'Last Interaction',
  'حالة الحساب': 'Account Status',
  'النظام يعمل': 'System Online',
  'تحديث عميل': 'Update Customer',
  'الذكاء الاصطناعي': 'Artificial Intelligence',
  'تحليل مخاطر متقدم': 'Advanced Risk Analysis',
  'توصيات للعمل': 'Actionable Recommendations',
  'رفع ملفات Excel/CSV': 'Upload Excel/CSV',
  'اضغط أو اسحب الملف هنا': 'Click or drag file here',
  'الملفات المدعومة: .xlsx, .csv': 'Supported files: .xlsx, .csv',
  'تم رفع البيانات بنجاح!': 'Data uploaded successfully!',
  'رفع البيانات': 'Upload Data',
  'اسم الموظف...': 'Employee Name...',
  'ر.س': 'SAR'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Sort dictionary by length (longest first) to avoid partial replacements
      const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
      
      for (const arabic of sortedKeys) {
        const english = dictionary[arabic];
        // Replace all occurrences using global regex
        const regex = new RegExp(arabic.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g');
        content = content.replace(regex, english);
      }
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDirectory(srcDir);
console.log('Translation complete.');
