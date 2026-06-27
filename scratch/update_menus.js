const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'lessons.html',
  'location.html',
  'parent-portal.html',
  'parent-daily.html',
  'parent-reports.html',
  'quran-course.html',
  'ramadan.html',
  'register.html',
  'register-adult.html'
];

const oldMenuBlock = `<li class="nav-dropdown">
              <a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">الدورة الصيفية <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="quran-course.html">التسجيل في الدورة</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`;

const oldMenuBlockActive = `<li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">الدورة الصيفية <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="quran-course.html" class="active">التسجيل في الدورة</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`;

const oldMenuBlockActiveParent = `<li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">الدورة الصيفية <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="quran-course.html">التسجيل في الدورة</a></li>
                <li><a href="parent-portal.html" class="active">متابعة ابني</a></li>
              </ul>
            </li>`;

const newMenuBlock = `<li class="nav-dropdown">
              <a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">تعليم الكبار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register-adult.html">التسجيل للكبار</a></li>
                <li><a href="adult-portal.html">متابعة التقدم</a></li>
              </ul>
            </li>
            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`;

const rootPath = path.resolve(__dirname, '..');

files.forEach(fileName => {
  const filePath = path.join(rootPath, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace standard block
  content = content.split(oldMenuBlock).join(newMenuBlock);
  content = content.split(oldMenuBlockActive).join(newMenuBlock);
  content = content.split(oldMenuBlockActiveParent).join(newMenuBlock);
  
  // Also handle double spaces or formatting variations in case
  const regex = /<li class="nav-dropdown">\s*<a href="#" class="dropdown-toggle[^>]*>الدورة الصيفية[^]*?<\/li>/g;
  content = content.replace(regex, newMenuBlock);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated menus in: ${fileName}`);
  } else {
    console.log(`No changes needed or matched in: ${fileName}`);
  }
});
