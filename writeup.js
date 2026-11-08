// ============================================================
// DETAIL PAGE ENGINE — project case studies, blog articles, tools
// Renders from CONFIG based on ?type=project|blog|tool&slug=...
// ============================================================

'use strict';

function renderInline(text) {
    return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderBlocks(blocks) {
    if (!Array.isArray(blocks)) return '';

    return blocks.map((block) => {
        if (!block || !block.type) return '';

        switch (block.type) {
            case 'h2': return `<h2>${escapeHtml(block.text)}</h2>`;
            case 'h3': return `<h3>${escapeHtml(block.text)}</h3>`;
            case 'code': return `<pre class="code-block"><code>${escapeHtml(block.text || '')}</code></pre>`;
            case 'list': {
                const tag = block.ordered ? 'ol' : 'ul';
                const items = (block.items || []).map((item) => `<li>${renderInline(item)}</li>`).join('');
                return `<${tag} class="writeup-list${block.ordered ? ' ordered' : ''}">${items}</${tag}>`;
            }
            case 'quote': return `<blockquote>${renderInline(block.text)}</blockquote>`;
            case 'p':
            default: return `<p>${renderInline(block.text)}</p>`;
        }
    }).join('');
}

function findWriteup(type, slug) {
    if (type === 'blog') return (CONFIG.blog || []).find((item) => item.slug === slug);
    if (type === 'tool') return (CONFIG.tools || []).find((item) => item.slug === slug);
    return (CONFIG.projects || []).find((item) => item.slug === slug);
}

function writeupList(type) {
    if (type === 'blog') return CONFIG.blog || [];
    if (type === 'tool') return CONFIG.tools || [];
    return CONFIG.projects || [];
}

function writeupTitle(item, type) {
    if (type === 'tool') return item.name;
    return item.title;
}

function writeupBackAnchor(type) {
    if (type === 'blog') return 'blog';
    if (type === 'tool') return 'tools';
    return 'projects';
}

function writeupPager(type, list, index) {
    const previous = list[index - 1];
    const next = list[index + 1];
    const label = type === 'blog' ? 'Article' : type === 'tool' ? 'Tool' : 'Case study';

    const link = (item, direction) => {
        if (!item) return '<span class="pager-spacer" aria-hidden="true"></span>';
        const arrow = direction === 'prev' ? '←' : '→';
        const cls = direction === 'prev' ? 'prev' : 'next';
        return `
            <a class="pager-link ${cls}" href="${escapeHtml(detailUrl(type, item.slug))}">
                ${direction === 'prev' ? `<span class="pager-label">${arrow} Previous ${label}</span>` : ''}
                <span class="pager-title">${escapeHtml(writeupTitle(item, type))}</span>
                ${direction === 'next' ? `<span class="pager-label">Next ${label} ${arrow}</span>` : ''}
            </a>
        `;
    };

    return `<nav class="writeup-pager" aria-label="More ${escapeHtml(type)}s">
        ${link(previous, 'prev')}
        ${link(next, 'next')}
    </nav>`;
}

function renderProjectWriteup(project, list, index) {
    const study = project.caseStudy || {};
    const severity = String(project.severity || 'info').toLowerCase();

    const section = (title, body) => body ? `
        <section class="writeup-section">
            <h2>${escapeHtml(title)}</h2>
            ${body}
        </section>
    ` : '';

    const listSection = (title, items, ordered) => {
        if (!Array.isArray(items) || !items.length) return '';
        const tag = ordered ? 'ol' : 'ul';
        return section(title, `<${tag} class="writeup-list${ordered ? ' ordered' : ''}">
            ${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}
        </${tag}>`);
    };

    return `
        <header class="writeup-header">
            <div class="writeup-eyebrow">
                <span class="project-badge ${escapeHtml(severity)}">${escapeHtml(severity.toUpperCase())}</span>
                <span class="writeup-type">${escapeHtml(project.type || '')}</span>
            </div>
            <h1>${escapeHtml(project.title)}</h1>
            <p class="writeup-lede">${escapeHtml(project.desc || '')}</p>
            <div class="writeup-meta">
                ${(project.meta || []).map((m) => `<span class="meta-item">${escapeHtml(m)}</span>`).join('')}
            </div>
            <div class="writeup-tags">
                ${(project.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
        </header>

        <div class="writeup-body">
            ${section('Summary', study.summary ? `<p>${renderInline(study.summary)}</p>` : '')}
            ${section('Scope', study.scope ? `<p>${renderInline(study.scope)}</p>` : '')}
            ${listSection('Key Findings', study.findings, false)}
            ${section('Impact', study.impact ? `<p>${renderInline(study.impact)}</p>` : '')}
            ${listSection('Remediation', study.remediation, true)}
            ${section('Disclosure', study.disclosure ? `<p>${renderInline(study.disclosure)}</p>` : '')}

            ${study.timeline && study.timeline.length ? `
            <section>
                <h3>Timeline</h3>
                <ul class="writeup-list">${study.timeline.map((t) => `<li><strong>${escapeHtml(t.date)}:</strong> ${renderInline(t.event)}</li>`).join('')}</ul>
            </section>
            ` : ''}

            ${project.repo ? `
                <p class="writeup-code-link">
                    <a class="btn btn-sm" href="${escapeHtml(project.repo)}" target="_blank" rel="noopener">View repository ↗</a>
                </p>
            ` : ''}

            <aside class="writeup-cta">
                <div>
                    <strong>Found something similar?</strong>
                    <p>I can help validate the issue, assess impact, and write a remediation plan your engineers can act on.</p>
                </div>
                <a class="btn btn-primary" href="index.html#contact">Get in touch →</a>
            </aside>
        </div>

        ${writeupPager('project', list, index)}
    `;
}

function renderBlogWriteup(post, list, index) {
    return `
        <header class="writeup-header">
            <div class="writeup-eyebrow">
                <span class="writeup-type">${escapeHtml(post.category || 'Article')}</span>
                <span class="writeup-type">${escapeHtml(formatDate(post.date))}</span>
                ${post.readTime ? `<span class="writeup-type">${escapeHtml(post.readTime)} read</span>` : ''}
            </div>
            <h1>${escapeHtml(post.title)}</h1>
            <p class="writeup-lede">${escapeHtml(post.excerpt || '')}</p>
            <div class="writeup-tags">
                ${(post.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
        </header>

        <div class="writeup-body article-body">
            ${renderBlocks(post.content)}
        </div>

        <aside class="writeup-cta">
            <div>
                <strong>Want this tested on your product?</strong>
                <p>I run authorised web and API assessments with clear, reproducible reporting.</p>
            </div>
            <a class="btn btn-primary" href="index.html#contact">Start a project →</a>
        </aside>

        ${writeupPager('blog', list, index)}
    `;
}

function renderToolWriteup(tool, list, index) {
    const usage = tool.usage || {};
    const section = (title, body) => body ? `
        <section class="writeup-section">
            <h2>${escapeHtml(title)}</h2>
            ${body}
        </section>
    ` : '';

    return `
        <header class="writeup-header">
            <div class="writeup-eyebrow">
                <span class="writeup-type">${escapeHtml(tool.language || 'Tool')}</span>
                <span class="writeup-type">⭐ ${escapeHtml(tool.stars || '—')}</span>
            </div>
            <h1>${escapeHtml(tool.name)}</h1>
            <p class="writeup-lede">${escapeHtml(tool.desc || '')}</p>
            <div class="writeup-tags">
                ${(tool.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
        </header>

        <div class="writeup-body">
            ${section('Installation', usage.install ? `<pre class="code-block"><code>${escapeHtml(usage.install)}</code></pre>` : '')}
            ${section('Usage', usage.example ? `<pre class="code-block"><code>${escapeHtml(usage.example)}</code></pre>` : '')}
            ${section('Features', Array.isArray(usage.features) && usage.features.length ? `<ul class="writeup-list">
                ${usage.features.map((item) => `<li>${renderInline(item)}</li>`).join('')}
            </ul>` : '')}
            ${usage.note ? `<aside class="writeup-note"><strong>Note</strong><p>${renderInline(usage.note)}</p></aside>` : ''}

            ${tool.link ? `
                <p class="writeup-code-link">
                    <a class="btn btn-sm" href="${escapeHtml(tool.link)}" target="_blank" rel="noopener">View source on GitHub ↗</a>
                </p>
            ` : ''}
        </div>

        ${writeupPager('tool', list, index)}
    `;
}

function setWriteupMeta(title, description, type, slug) {
    const fullTitle = `${title} | ${CONFIG.name}`;
    const desc = String(description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const canonical = `${siteUrl()}/writeup.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;

    document.title = fullTitle;

    const setMeta = (attr, key, value) => {
        if (!value) return;
        let tag = document.querySelector(`meta[${attr}="${key}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, key);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', value);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', type === 'blog' ? 'article' : 'website');
    setMeta('property', 'og:url', canonical);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);

    const ogImage = CONFIG.seo && CONFIG.seo.ogImage ? absoluteUrl(CONFIG.seo.ogImage) : '';
    setMeta('property', 'og:image', ogImage);
    setMeta('name', 'twitter:image', ogImage);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
    }
    link.href = canonical;
}

function renderWriteupNotFound(type) {
    const anchor = writeupBackAnchor(type);
    return `
        <header class="writeup-header">
            <div class="writeup-eyebrow"><span class="writeup-type">404</span></div>
            <h1>That writeup does not exist</h1>
            <p class="writeup-lede">The link may be mistyped, or the content was renamed. Everything published lives on the main page.</p>
        </header>
        <div class="writeup-body">
            <p><a class="btn btn-primary" href="index.html#${anchor}">Back to ${anchor} →</a></p>
        </div>
    `;
}

function initWriteup() {
    const root = document.getElementById('writeup-root');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const requestedType = (params.get('type') || 'project').toLowerCase();
    const type = ['project', 'blog', 'tool'].includes(requestedType) ? requestedType : 'project';
    const slug = params.get('slug') || '';

    const list = writeupList(type);
    const index = list.findIndex((item) => item.slug === slug);
    const item = index >= 0 ? list[index] : findWriteup(type, slug);
    const anchor = writeupBackAnchor(type);

    const backLink = document.getElementById('back-link');
    if (backLink) {
        backLink.href = `index.html#${anchor}`;
        backLink.textContent = `← Back to ${anchor}`;
    }

    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs) {
        const label = type === 'blog' ? 'Blog' : type === 'tool' ? 'Tools' : 'Projects';
        breadcrumbs.innerHTML = `
            <a href="index.html">Home</a>
            <span aria-hidden="true">/</span>
            <a href="index.html#${anchor}">${label}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">${escapeHtml(item ? writeupTitle(item, type) : 'Not found')}</span>
        `;
    }

    document.body.dataset.detailType = type;

    if (!item) {
        root.innerHTML = renderWriteupNotFound(type);
        document.title = `Writeup not found | ${CONFIG.name}`;
        const description = document.querySelector('meta[name="description"]');
        if (description) description.setAttribute('content', 'The requested writeup could not be found.');
        return;
    }

    if (type === 'blog') {
        root.innerHTML = renderBlogWriteup(item, list, index);
        setWriteupMeta(item.title, item.excerpt, type, item.slug);
    } else if (type === 'tool') {
        root.innerHTML = renderToolWriteup(item, list, index);
        setWriteupMeta(item.name, item.desc, type, item.slug);
    } else {
        root.innerHTML = renderProjectWriteup(item, list, index);
        const description = (item.caseStudy && item.caseStudy.summary) || item.desc;
        setWriteupMeta(item.title, description, type, item.slug);
    }

    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', initWriteup);