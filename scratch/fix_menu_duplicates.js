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

const patternsToReplace = [
  // 1. Double active case
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html" class="active">متابعة ابني</a></li>
              </ul>
            </li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`,
  // 2. Normal dropdown-toggle active case
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`,
  // 3. Normal case
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`
];

const replacements = [
  // 1
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html" class="active">متابعة ابني</a></li>
              </ul>
            </li>`,
  // 2
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle active" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`,
  // 3
  `            <li class="nav-dropdown">
              <a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">دورة الصغار <i class="ph ph-caret-down" style="font-size: 0.8em; margin-inline-start: 2px; vertical-align: middle;"></i></a>
              <ul class="dropdown-menu">
                <li><a href="register.html">التسجيل للصغار</a></li>
                <li><a href="parent-portal.html">متابعة ابني</a></li>
              </ul>
            </li>`
];

const rootPath = path.resolve(__dirname, '..');

files.forEach(fileName => {
  const filePath = path.join(rootPath, fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Run normal replaces
  for (let i = 0; i < patternsToReplace.length; i++) {
    content = content.split(patternsToReplace[i]).join(replacements[i]);
  }

  // General regex cleaning for any leftover broken tags
  const regex = /<\/ul>\s*<\/li>\s*<li><a href="parent-portal\.html"[^>]*>متابعة ابني<\/a><\/li>\s*<\/ul>\s*<\/li>/g;
  content = content.replace(regex, '</ul>\n            </li>');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned menu duplicates in: ${fileName}`);
  } else {
    console.log(`No duplicate menus found in: ${fileName}`);
  }
});
