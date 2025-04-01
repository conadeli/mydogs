const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');

// 설정
const postsDir = path.join(__dirname, '../_posts');
const outputDir = path.join(__dirname, '..');
const templateDir = path.join(__dirname, '../_templates');

// 인덱스 페이지용 데이터
let postsList = [];

// 템플릿 불러오기
const postTemplate = fs.readFileSync(path.join(templateDir, 'post.html'), 'utf8');
const indexTemplate = fs.readFileSync(path.join(templateDir, 'index.html'), 'utf8');

// _posts 디렉토리 확인하고 없으면 생성
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}

// 모든 포스트 파일 처리
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));

// 포스트 목록 정렬을 위한 배열
let posts = [];

// 각 포스트 처리
postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // frontmatter와 내용 분리
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontMatterMatch) {
    const frontMatter = yaml.load(frontMatterMatch[1]);
    const markdownContent = frontMatterMatch[2];
    
    // HTML로 변환 (마크다운 또는 직접 HTML 사용)
    let htmlContent;
    
    if (frontMatter.format === 'html' && frontMatter.html_body) {
      // HTML 형식으로 작성된 경우 직접 사용
      htmlContent = frontMatter.html_body;
    } else {
      // 마크다운으로 작성된 경우 변환
      htmlContent = marked.parse(markdownContent);
    }
    
    // 파일명에서 날짜와 slug 추출
    const fileNameMatch = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
    
    if (fileNameMatch) {
      const date = fileNameMatch[1];
      const slug = fileNameMatch[2];
      
      // 출력 파일 경로
      const outputPath = path.join(outputDir, `${slug}.html`);
      
      // 템플릿 변수 교체
      let postHtml = postTemplate
        .replace(/{{title}}/g, frontMatter.title)
        .replace(/{{date}}/g, frontMatter.date)
        .replace(/{{category}}/g, frontMatter.category || '')
        .replace(/{{content}}/g, htmlContent);
      
      // 태그 처리
      if (frontMatter.tags && Array.isArray(frontMatter.tags)) {
        const tagsHtml = frontMatter.tags.map(tag => `<a href="#tag-${tag}">${tag}</a>`).join(' ');
        postHtml = postHtml.replace(/{{tags}}/g, tagsHtml);
      } else {
        postHtml = postHtml.replace(/{{tags}}/g, '');
      }
      
      // 섬네일 이미지 처리
      if (frontMatter.thumbnail) {
        postHtml = postHtml.replace(/{{thumbnail}}/g, `<img src="${frontMatter.thumbnail}" alt="${frontMatter.title}" class="featured-image">`);
      } else {
        postHtml = postHtml.replace(/{{thumbnail}}/g, '');
      }
      
      // HTML 파일 저장
      fs.writeFileSync(outputPath, postHtml);
      
      // 인덱스용 포스트 정보 추가
      posts.push({
        title: frontMatter.title,
        date: frontMatter.date,
        slug: slug,
        thumbnail: frontMatter.thumbnail || '',
        summary: markdownContent.substring(0, 150) + '...',
        category: frontMatter.category || '',
        tags: frontMatter.tags || []
      });
    }
  }
});

// 날짜 기준으로 내림차순 정렬
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// 인덱스 페이지 생성
let postsHtml = '';
posts.forEach(post => {
  const thumbnailHtml = post.thumbnail 
    ? `<img src="${post.thumbnail}" alt="${post.title}" class="featured-image">`
    : '';
  
  postsHtml += `
    <article class="post">
      <h2 class="post-title"><a href="${post.slug}.html">${post.title}</a></h2>
      <div class="post-meta">
        <span class="date">${post.date}</span>
        <span class="category">${post.category}</span>
      </div>
      <div class="post-content">
        ${thumbnailHtml}
        <p>${post.summary}</p>
        <a href="${post.slug}.html" class="read-more">더 읽기</a>
      </div>
    </article>
  `;
});

// 최근 포스트 목록
let recentPostsHtml = '';
posts.slice(0, 5).forEach(post => {
  recentPostsHtml += `<li><a href="${post.slug}.html">${post.title}</a></li>`;
});

// 카테고리 목록 생성
const categories = [...new Set(posts.map(post => post.category).filter(Boolean))];
let categoriesHtml = '';
categories.forEach(category => {
  categoriesHtml += `<li><a href="#category-${category}">${category}</a></li>`;
});

// 인덱스 템플릿 변수 교체
let indexHtml = indexTemplate
  .replace(/{{posts}}/g, postsHtml)
  .replace(/{{recent_posts}}/g, recentPostsHtml)
  .replace(/{{categories}}/g, categoriesHtml);

// 인덱스 파일 저장
fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

console.log(`${posts.length}개의 포스트를 처리했습니다.`);