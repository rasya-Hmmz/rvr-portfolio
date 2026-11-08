// ============================================================
// ULTIMATE PORTFOLIO ENGINE — Renders CONFIG, wires interactions
// ============================================================

'use strict';

/* ── Helpers ───────────────────────────────────────────────── */

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr || '');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function siteUrl() {
    const configured = CONFIG.site && CONFIG.site.url ? CONFIG.site.url : (CONFIG.seo && CONFIG.seo.canonicalUrl) || '';
    return String(configured).replace(/\/+$/, '');
}

function absoluteUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${siteUrl()}/${String(path).replace(/^\/+/, '')}`;
}

function detailUrl(type, slug) {
    if (!slug) return '#';
    return `writeup.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
}

function hasRealPGP() {
    return Boolean(CONFIG.pgpKey) && !/replace with your key/i.test(CONFIG.pgpKey);
}

function getSeverityColor(severity) {
    const colors = {
        critical: 'var(--danger)',
        high: 'var(--warning)',
        medium: 'var(--accent)',
        low: 'var(--info)',
        info: 'var(--fg-muted)'
    };
    return colors[severity] || colors.info;
}

/* ── Theme ─────────────────────────────────────────────────── */

function initTheme() {
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');

    const readSaved = () => {
        try { return localStorage.getItem('theme'); } catch (_) { return null; }
    };

    const apply = (theme) => {
        const resolved = theme === 'light' || theme === 'dark'
            ? theme
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        root.setAttribute('data-theme', resolved);
        if (toggle) toggle.setAttribute('aria-pressed', String(resolved === 'dark'));
    };

    apply(readSaved() || (CONFIG.ui && CONFIG.ui.theme) || 'dark');

    if (toggle && (!CONFIG.ui || CONFIG.ui.showThemeToggle !== false)) {
        toggle.style.display = 'flex';
        toggle.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('theme', next); } catch (_) { }
            apply(next);
        });
    }
}

/* ── SEO + JSON-LD ────────────────────────────────────────── */

function initSEO() {
    const seo = CONFIG.seo;
    if (!seo) return;

    const canonical = seo.canonicalUrl || siteUrl();
    const image = absoluteUrl(seo.ogImage);

    document.title = seo.title;

    const metaTags = [
        { name: 'description', content: seo.description },
        { name: 'keywords', content: seo.keywords },
        { name: 'author', content: seo.author },
        { name: 'theme-color', content: (CONFIG.site && CONFIG.site.themeColor) || '#000000' },
        { property: 'og:site_name', content: CONFIG.name },
        { property: 'og:title', content: seo.title },
        { property: 'og:description', content: seo.description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonical },
        { property: 'og:image', content: image },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: seo.title },
        { name: 'twitter:description', content: seo.description },
        { name: 'twitter:image', content: image },
        { name: 'twitter:site', content: seo.twitterHandle },
        { name: 'twitter:creator', content: seo.twitterHandle }
    ];

    metaTags.forEach((m) => {
        if (!m.content) return;
        const attr = m.name ? 'name' : 'property';
        let tag = document.querySelector(`meta[${attr}="${m[attr]}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, m[attr]);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', m.content);
    });

    if (canonical) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = canonical;
    }

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: CONFIG.name,
        jobTitle: CONFIG.title,
        description: CONFIG.tagline,
        url: canonical,
        email: CONFIG.email ? `mailto:${CONFIG.email}` : undefined,
        sameAs: Object.values(CONFIG.social || {}).filter(Boolean),
        knowsAbout: ['Web Penetration Testing', 'Bug Bounty', 'API Security', 'Red Teaming', 'CTF', 'Secure Code Review'],
        hasCredential: (CONFIG.certifications || []).map((c) => ({
            '@type': 'EducationalOccupationalCredential',
            name: c.name,
            recognizedBy: { '@type': 'Organization', name: c.issuer },
            dateCreated: c.year
        }))
    };

    let schemaScript = document.querySelector('script[type="application/ld+json"]');
    if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(schema);
}

/* ── Analytics ────────────────────────────────────────────── */

function initAnalytics() {
    const analytics = CONFIG.site && CONFIG.site.analytics;
    if (!analytics || !analytics.provider) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://plausible.io/js/script.js';
    script.setAttribute('data-domain', analytics.domain || window.location.hostname);

    if (String(analytics.provider).toLowerCase() === 'umami') {
        script.src = 'https://cloud.umami.is/script.js';
        script.removeAttribute('data-domain');
        script.setAttribute('data-website-id', analytics.domain || '');
    }

    document.head.appendChild(script);
}

/* ── Section Renderers ────────────────────────────────────── */

function renderAbout() {
    const about = CONFIG.about;
    if (!about) return;

    const background = document.querySelector('.about-card:nth-child(1) p');
    if (background && about.background) background.textContent = about.background;

    const techStack = document.querySelector('.tech-stack');
    if (techStack && about.techStack) {
        techStack.innerHTML = about.techStack
            .map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`)
            .join('');
    }

    const specializations = document.querySelector('.specialization-list');
    if (specializations && about.specializations) {
        specializations.innerHTML = about.specializations.map((s) => `
            <li>
                <span class="spec-icon" aria-hidden="true">${escapeHtml(s.icon || '▸')}</span>
                <div>
                    <strong>${escapeHtml(s.title)}</strong>
                    <span>${escapeHtml(s.desc)}</span>
                </div>
            </li>
        `).join('');
    }

    const methodology = document.querySelector('.methodology-steps');
    if (methodology && about.methodology) {
        methodology.innerHTML = about.methodology.map((m) => `
            <div class="method-step">
                <span class="step-num">${escapeHtml(m.step)}</span>
                <div>
                    <strong>${escapeHtml(m.title)}</strong>
                    <span>${escapeHtml(m.desc)}</span>
                </div>
            </div>
        `).join('');
    }
}

function renderSkills() {
    const skills = CONFIG.skills;
    if (!skills) return;

    // Vulnerabilities with categories
    const vulnContainer = document.querySelector('.skill-bars');
    if (vulnContainer && skills.vulnerabilities) {
        vulnContainer.innerHTML = skills.vulnerabilities.map((v) => `
            <div class="skill-item" role="listitem">
                <div class="skill-header">
                    <span class="skill-name">${escapeHtml(v.name)}</span>
                    <span class="skill-level">${v.level}%</span>
                </div>
                <div class="skill-bar-bg" role="progressbar" aria-valuenow="${v.level}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(v.name)} proficiency">
                    <div class="skill-bar-fill" style="width: 0%;" data-level="${v.level}"></div>
                </div>
            </div>
        `).join('');
    }

    // Tools with categories
    const toolsContainer = document.querySelector('.tools-grid');
    if (toolsContainer && skills.tools) {
        toolsContainer.innerHTML = skills.tools.map((t) => `
            <div class="tool-item" role="listitem">
                <span class="tool-name">${escapeHtml(t.name)}</span>
                <span class="tool-level">${escapeHtml(t.level)}</span>
            </div>
        `).join('');
    }

    // Languages
    const langContainer = document.querySelector('.lang-grid');
    if (langContainer && skills.languages) {
        langContainer.innerHTML = skills.languages.map((l) => `
            <div class="lang-item" role="listitem">
                <div class="lang-header">
                    <span class="lang-name">${escapeHtml(l.name)}</span>
                    <span class="lang-level">${l.level}%</span>
                </div>
                <div class="skill-bar-bg" role="progressbar" aria-valuenow="${l.level}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(l.name)} proficiency">
                    <div class="skill-bar-fill" style="width: 0%;" data-level="${l.level}"></div>
                </div>
            </div>
        `).join('');
    }

    // Animate skill bars on scroll
    if (CONFIG.animation && CONFIG.animation.enabled !== false) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.skill-bar-fill').forEach((bar) => {
                        const level = bar.getAttribute('data-level');
                        setTimeout(() => { bar.style.width = level + '%'; }, 100);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('.skill-category').forEach((cat) => observer.observe(cat));
    }
}

function renderProjects() {
    const projects = CONFIG.projects;
    const container = document.querySelector('.projects-grid');
    if (!container || !projects) return;

    container.innerHTML = projects.map((p) => {
        const sevClass = `severity-${p.severity}`;
        const featuredClass = p.featured ? 'featured' : '';
        return `
        <article class="project-card ${sevClass} ${featuredClass}" role="listitem" data-slug="${escapeHtml(p.slug)}">
            <div class="project-header">
                <span class="project-type">${escapeHtml(p.type)}</span>
                <span class="project-severity ${sevClass}">${escapeHtml(p.severity.toUpperCase())}</span>
            </div>
            <h3 class="project-title">${escapeHtml(p.title)}</h3>
            <p class="project-desc">${escapeHtml(p.desc)}</p>
            <div class="project-meta">
                ${p.meta.map((m) => `<span class="meta-tag">${escapeHtml(m)}</span>`).join('')}
            </div>
            <div class="project-tags">
                ${p.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
            </div>
            <div class="project-actions">
                ${p.caseStudy ? `<button class="btn btn-sm btn-detail" data-slug="${escapeHtml(p.slug)}" data-type="${escapeHtml(p.category)}">Case Study</button>` : ''}
                ${p.repo ? `<a href="${escapeHtml(p.repo)}" class="btn btn-sm btn-github" target="_blank" rel="noopener">View Code</a>` : ''}
            </div>
        </article>
        `;
    }).join('');

    document.querySelectorAll('.btn-detail').forEach((btn) => {
        btn.addEventListener('click', () => openCaseStudy(btn.dataset.slug, btn.dataset.type));
    });
}

function openCaseStudy(slug, type) {
    const project = CONFIG.projects?.find((p) => p.slug === slug);
    if (!project || !project.caseStudy) return;

    const cs = project.caseStudy;
    const modal = document.createElement('div');
    modal.className = 'modal case-study-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cs-title');
    modal.innerHTML = `
        <div class="modal-content case-study-content">
            <button class="close-modal" aria-label="Close case study">&times;</button>
            <div class="cs-header">
                <span class="cs-type">${escapeHtml(project.type)}</span>
                <span class="cs-severity severity-${project.severity}">${escapeHtml(project.severity.toUpperCase())}</span>
            </div>
            <h2 id="cs-title" class="cs-title">${escapeHtml(project.title)}</h2>
            <div class="cs-meta">
                ${project.meta.map((m) => `<span class="meta-item">${escapeHtml(m)}</span>`).join('')}
            </div>
            <div class="cs-body">
                <section>
                    <h3>Summary</h3>
                    <p>${renderInline(cs.summary)}</p>
                </section>
                <section>
                    <h3>Scope</h3>
                    <p>${renderInline(cs.scope)}</p>
                </section>
                <section>
                    <h3>Key Findings</h3>
                    <ul>${(cs.findings || []).map((f) => `<li>${renderInline(f)}</li>`).join('')}</ul>
                </section>
                <section>
                    <h3>Impact</h3>
                    <p>${renderInline(cs.impact)}</p>
                </section>
                <section>
                    <h3>Remediation</h3>
                    <ul>${(cs.remediation || []).map((r) => `<li>${renderInline(r)}</li>`).join('')}</ul>
                </section>
                <section>
                    <h3>Disclosure</h3>
                    <p>${renderInline(cs.disclosure)}</p>
                </section>
                ${cs.timeline && cs.timeline.length ? `
                <section>
                    <h3>Timeline</h3>
                    <ul class="writeup-list">${cs.timeline.map((t) => `<li><strong>${escapeHtml(t.date)}:</strong> ${renderInline(t.event)}</li>`).join('')}</ul>
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
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } });
}

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

function renderBlog() {
    const blog = CONFIG.blog;
    const container = document.querySelector('.blog-grid');
    if (!container || !blog) return;

    container.innerHTML = blog.map((b) => `
        <article class="blog-card" role="listitem">
            <div class="blog-header">
                <span class="blog-category">${escapeHtml(b.category)}</span>
                <time class="blog-date" datetime="${escapeHtml(b.date)}">${formatDate(b.date)}</time>
            </div>
            <h3 class="blog-title">${escapeHtml(b.title)}</h3>
            <p class="blog-excerpt">${escapeHtml(b.excerpt)}</p>
            <div class="blog-tags">
                ${b.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
            </div>
            <a href="${detailUrl('blog', b.slug)}" class="btn btn-sm btn-read">Read More</a>
        </article>
    `).join('');
}

function renderTools() {
    const tools = CONFIG.tools;
    const container = document.querySelector('.tools-showcase');
    if (!container || !tools) return;

    container.innerHTML = tools.map((t) => `
        <article class="tool-card" role="listitem">
            <div class="tool-header">
                <h3 class="tool-name">${escapeHtml(t.name)}</h3>
                <span class="tool-lang">${escapeHtml(t.language)}</span>
            </div>
            <p class="tool-desc">${escapeHtml(t.desc)}</p>
            <div class="tool-meta">
                <span class="tool-stars">⭐ ${escapeHtml(t.stars)}</span>
                <div class="tool-tags">
                    ${t.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            <div class="tool-actions">
                <a href="${escapeHtml(t.link)}" class="btn btn-sm btn-github" target="_blank" rel="noopener">GitHub</a>
                <button class="btn btn-sm btn-tool-detail" data-slug="${escapeHtml(t.slug)}">Details</button>
            </div>
        </article>
    `).join('');

    document.querySelectorAll('.btn-tool-detail').forEach((btn) => {
        btn.addEventListener('click', () => openToolDetail(btn.dataset.slug));
    });
}

function openToolDetail(slug) {
    const tool = CONFIG.tools?.find((t) => t.slug === slug);
    if (!tool) return;

    const u = tool.usage;
    const modal = document.createElement('div');
    modal.className = 'modal tool-detail-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tool-title');
    modal.innerHTML = `
        <div class="modal-content tool-detail-content">
            <button class="close-modal" aria-label="Close tool detail">&times;</button>
            <h2 id="tool-title" class="tool-name">${escapeHtml(tool.name)}</h2>
            <p class="tool-desc">${escapeHtml(tool.desc)}</p>
            <div class="tool-meta">
                <span class="tool-lang">${escapeHtml(tool.language)}</span>
                <span class="tool-stars">⭐ ${escapeHtml(tool.stars)}</span>
            </div>
            <section>
                <h3>Installation</h3>
                <pre class="code-block"><code>${escapeHtml(u.install)}</code></pre>
            </section>
            <section>
                <h3>Usage Example</h3>
                <pre class="code-block"><code>${escapeHtml(u.example)}</code></pre>
            </section>
            <section>
                <h3>Features</h3>
                <ul class="writeup-list">${u.features.map((f) => `<li>${renderInline(f)}</li>`).join('')}</ul>
            </section>
            ${u.note ? `<aside class="tool-note"><strong>Note</strong><p>${renderInline(u.note)}</p></aside>` : ''}
            ${tool.link ? `
                <p class="writeup-code-link">
                    <a class="btn btn-sm" href="${escapeHtml(tool.link)}" target="_blank" rel="noopener">View source on GitHub ↗</a>
                </p>
            ` : ''}
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } });
}

function renderTimeline() {
    const timeline = CONFIG.timeline;
    const container = document.querySelector('.timeline');
    if (!container || !timeline) return;

    container.innerHTML = timeline.map((t, i) => `
        <div class="timeline-item" data-type="${escapeHtml(t.type || 'milestone')}" role="listitem" style="animation-delay: ${i * 100}ms">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <time class="timeline-year">${escapeHtml(t.year)}</time>
                <h3 class="timeline-title">${escapeHtml(t.title)}</h3>
                <p class="timeline-desc">${escapeHtml(t.desc)}</p>
            </div>
        </div>
    `).join('');
}

function renderCertifications() {
    const certs = CONFIG.certifications;
    const container = document.querySelector('.certs-grid');
    if (!container || !certs) return;

    container.innerHTML = certs.map((c) => `
        <article class="cert-card" role="listitem">
            <div class="cert-header">
                <span class="cert-name">${escapeHtml(c.name)}</span>
                <time class="cert-year">${escapeHtml(c.year)}</time>
            </div>
            <p class="cert-issuer">${escapeHtml(c.issuer)}</p>
            <p class="cert-desc">${escapeHtml(c.desc)}</p>
            ${c.verifyUrl ? `<a href="${escapeHtml(c.verifyUrl)}" class="btn btn-sm btn-verify" target="_blank" rel="noopener">Verify</a>` : ''}
        </article>
    `).join('');
}

function renderHallOfFame() {
    const hall = CONFIG.hallOfFame;
    const container = document.querySelector('.hall-grid');
    if (!container || !hall) return;

    container.innerHTML = hall.map((h) => `
        <div class="hall-item" role="listitem" data-tier="${escapeHtml(h.tier || '')}" tabindex="0">
            ${h.tier ? `<span class="hall-tier ${escapeHtml(h.tier.toLowerCase())}">${escapeHtml(h.tier)}</span>` : ''}
            ${h.logo ? `<img src="${escapeHtml(h.logo)}" alt="${escapeHtml(h.name)}" class="hall-logo" loading="lazy">` : `<div class="hall-logo placeholder">${escapeHtml(h.name.charAt(0))}</div>`}
            <span class="hall-name">${escapeHtml(h.name)}</span>
        </div>
    `).join('');

    // Click/tap to show tier
    container.querySelectorAll('.hall-item').forEach((item) => {
        item.addEventListener('click', () => item.classList.toggle('show-tier'));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.classList.toggle('show-tier');
            }
        });
    });
}

function renderTalks() {
    const talks = CONFIG.talks;
    const container = document.querySelector('.talks-grid');
    if (!container || !talks) return;

    container.innerHTML = talks.map((t) => `
        <article class="talk-card" role="listitem">
            <div class="talk-header">
                <h3 class="talk-title">${escapeHtml(t.title)}</h3>
                <time class="talk-date" datetime="${escapeHtml(t.date)}">${formatDate(t.date)}</time>
            </div>
            <p class="talk-event">${escapeHtml(t.event)}</p>
            <p class="talk-desc">${escapeHtml(t.desc)}</p>
            <div class="talk-tags">
                ${t.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div style="display:flex; gap:12px; margin-top:auto;">
                ${t.link ? `<a href="${escapeHtml(t.link)}" class="talk-link" target="_blank" rel="noopener">Watch →</a>` : ''}
                ${t.slides ? `<a href="${escapeHtml(t.slides)}" class="talk-link" target="_blank" rel="noopener">Slides →</a>` : ''}
            </div>
        </article>
    `).join('');
}

function renderTestimonials() {
    const testimonials = CONFIG.testimonials;
    const container = document.querySelector('.testimonials-grid');
    if (!container || !testimonials) return;

    container.innerHTML = testimonials.map((t) => `
        <article class="testimonial-card" role="listitem">
            <p class="testimonial-content">"${escapeHtml(t.content)}"</p>
            <div class="testimonial-author">
                <div class="testimonial-avatar">${escapeHtml(t.initials)}</div>
                <div>
                    <div class="testimonial-name">${escapeHtml(t.name)}</div>
                    <div class="testimonial-role">${escapeHtml(t.role)}</div>
                </div>
            </div>
        </article>
    `).join('');
}

function renderContact() {
    const contactInfo = document.querySelector('.contact-info');
    if (contactInfo) {
        const p = contactInfo.querySelector('p');
        if (p && CONFIG.subtitle) p.textContent = CONFIG.subtitle;

        const methods = contactInfo.querySelector('.contact-methods');
        if (methods && CONFIG.email) {
            methods.innerHTML = `
                <a href="mailto:${escapeHtml(CONFIG.email)}" class="contact-method">
                    <span class="method-icon">[MAIL]</span>
                    <span>${escapeHtml(CONFIG.email)}</span>
                </a>
                <span class="contact-method">
                    <span class="method-icon">[LOC]</span>
                    <span>${escapeHtml(CONFIG.location)}</span>
                </span>
                <span class="contact-method">
                    <span class="method-icon">[AVAIL]</span>
                    <span>${escapeHtml(CONFIG.availability)}</span>
                </span>
            `;
        }

        const pgpPre = contactInfo.querySelector('.pgp-block pre');
        const pgpBtn = contactInfo.querySelector('.pgp-block .btn-copy');
        if (pgpPre && hasRealPGP()) {
            pgpPre.textContent = CONFIG.pgpKey;
            if (pgpBtn) pgpBtn.style.display = 'inline-flex';
        } else if (pgpPre) {
            pgpPre.textContent = '(Add your PGP public key in config.js to display here)';
            if (pgpBtn) pgpBtn.style.display = 'none';
        }

        // Live status
        const liveStatusEl = contactInfo.querySelector('#live-status');
        if (liveStatusEl && CONFIG.liveStatus?.enabled) {
            const platforms = CONFIG.liveStatus.platforms?.join(', ') || 'HackerOne & Bugcrowd';
            liveStatusEl.innerHTML = `<span>${escapeHtml(CONFIG.liveStatus.text)} (${platforms})</span>`;
            liveStatusEl.style.display = 'flex';
        }
    }

    // Form submit
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const endpoint = CONFIG.site?.formEndpoint;
            if (endpoint) {
                fetch(endpoint, { method: 'POST', body: fd })
                    .then(() => alert('Message sent!'))
                    .catch(() => fallbackMailto(fd));
            } else {
                fallbackMailto(fd);
            }
        });
    }

    function fallbackMailto(fd) {
        const subject = `Portfolio Contact: ${fd.get('service')}`;
        const body = `Name: ${fd.get('name')}\nEmail: ${fd.get('email')}\nService: ${fd.get('service')}\n\nScope & Details:\n${fd.get('scope')}`;
        const mailto = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
    }
}

function renderFooter() {
    const brand = document.querySelector('.footer-brand p');
    if (brand && CONFIG.tagline) brand.textContent = CONFIG.tagline;

    const disclaimer = document.querySelector('.footer-bottom .disclaimer');
    if (disclaimer && CONFIG.footer?.disclaimer) disclaimer.textContent = CONFIG.footer.disclaimer;

    const socialLinks = document.querySelectorAll('.footer-social a');
    const socialOrder = ['github', 'twitter', 'linkedin', 'hackerone', 'bugcrowd'];
    socialOrder.forEach((key, i) => {
        const link = socialLinks[i];
        if (link && CONFIG.social?.[key]) {
            link.href = CONFIG.social[key];
        }
    });

    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
}

function renderDashboard() {
    const dashboard = CONFIG.dashboard;
    if (!dashboard || dashboard.enabled === false) return;

    const card = document.getElementById('simple-card');
    const terminal = document.getElementById('simple-terminal');
    if (!card || !terminal) return;

    const pane = dashboard.panes[0];
    if (!pane) return;

    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">${escapeHtml(pane.title)}</span>
        </div>
        <pre class="card-content">${pane.content.map((line) => escapeHtml(line)).join('\n')}</pre>
    `;

    // Code Editor Animation (replaces terminal)
    const codeAnim = CONFIG.codeAnimation;
    if (codeAnim) {
        terminal.innerHTML = `
            <div class="code-editor-header">
                <div class="code-editor-dots">
                    <span class="dot close"></span>
                    <span class="dot minimize"></span>
                    <span class="dot maximize"></span>
                </div>
                <div class="code-editor-title">${escapeHtml(codeAnim.title || 'exploit.py')}</div>
                <div class="code-editor-lang">${escapeHtml(codeAnim.language || 'Python')}</div>
            </div>
            <div class="code-editor-content" id="code-editor-content">
                <div class="code-line" data-line="1"><span class="line-num">1</span><span class="code-text" id="code-line-1"></span></div>
            </div>
            <div class="code-editor-footer">
                <span class="code-status">Ln 1, Col 1</span>
                <span class="code-status">${escapeHtml(codeAnim.language || 'Python')}</span>
                <span class="code-status">UTF-8</span>
            </div>
        `;
        initCodeEditor(codeAnim);
    }
}

function initCodeEditor(codeAnim) {
    const container = document.getElementById('code-editor-content');
    if (!container) return;

    const lines = codeAnim.lines || [];
    const typeSpeed = codeAnim.typeSpeed || 40;
    const lineDelay = codeAnim.lineDelay || 400;
    let lineIndex = 0;
    let charIndex = 0;
    let currentLine = '';

    function typeNextLine() {
        if (lineIndex >= lines.length) {
            // Animation complete - only loop if loopDelay is set and > 0
            if (codeAnim.loopDelay && codeAnim.loopDelay > 0) {
                setTimeout(() => {
                    container.innerHTML = '';
                    lineIndex = 0;
                    charIndex = 0;
                    currentLine = '';
                    addLineElement();
                    typeNextLine();
                }, codeAnim.loopDelay);
            }
            return;
        }

        const lineData = lines[lineIndex];
        const text = lineData.text || '';
        const indent = lineData.indent || 0;
        const highlight = lineData.highlight || false;

        if (charIndex < text.length) {
            currentLine += text[charIndex];
            charIndex++;
            updateCurrentLine(currentLine, indent, highlight);
            setTimeout(typeNextLine, typeSpeed);
        } else {
            // Line complete
            finalizeLine(currentLine, indent, highlight);
            lineIndex++;
            charIndex = 0;
            currentLine = '';
            addLineElement();
            setTimeout(typeNextLine, lineDelay);
        }
    }

    function addLineElement() {
        const lineNum = lineIndex + 1;
        const lineEl = document.createElement('div');
        lineEl.className = 'code-line';
        lineEl.dataset.line = lineNum;
        lineEl.innerHTML = `<span class="line-num">${lineNum}</span><span class="code-text" id="code-line-${lineNum}"></span>`;
        container.appendChild(lineEl);
        container.scrollTop = container.scrollHeight;
    }

    function updateCurrentLine(text, indent, highlight) {
        const lineEl = container.querySelector(`[data-line="${lineIndex + 1}"]`);
        if (!lineEl) return;
        const textEl = lineEl.querySelector('.code-text');
        if (!textEl) return;

        const spaces = ' '.repeat(indent * 4);
        textEl.innerHTML = highlight
            ? `<span class="code-highlight">${escapeHtml(spaces + currentLine + '_')}</span>`
            : escapeHtml(spaces + currentLine + '_');

        // Update footer
        updateFooter(lineIndex + 1, text.length + 1);
    }

    function finalizeLine(text, indent, highlight) {
        const lineEl = container.querySelector(`[data-line="${lineIndex + 1}"]`);
        if (!lineEl) return;
        const textEl = lineEl.querySelector('.code-text');
        if (!textEl) return;

        const spaces = ' '.repeat(indent * 4);
        const highlighted = highlightSyntax(text, codeAnim.language || 'python');
        textEl.innerHTML = highlight
            ? `<span class="code-highlight">${spaces}${highlighted}</span>`
            : `${spaces}${highlighted}`;
    }

    function updateFooter(line, col) {
        const footer = document.querySelector('.code-editor-footer');
        if (!footer) return;
        const spans = footer.querySelectorAll('.code-status');
        if (spans[0]) spans[0].textContent = `Ln ${line}, Col ${col}`;
    }

    function highlightSyntax(code, lang) {
        // Simple syntax highlighting
        return code
            .replace(/\b(def|class|import|from|return|if|else|elif|for|while|try|except|with|as|yield|lambda|async|await)\b/g, '<span class="kw">$1</span>')
            .replace(/\b(True|False|None|self|cls)\b/g, '<span class="const">$1</span>')
            .replace(/(".*?"|'.*?')/g, '<span class="str">$1</span>')
            .replace(/(\d+)/g, '<span class="num">$1</span>')
            .replace(/(#.*)/g, '<span class="cmt">$1</span>')
            .replace(/(@\w+)/g, '<span class="dec">$1</span>');
    }

    // Start
    addLineElement();
    if (CONFIG.animation && CONFIG.animation.enabled !== false) {
        setTimeout(typeNextLine, 1000);
    } else {
        // Render all at once
        lines.forEach((lineData, i) => {
            lineIndex = i;
            const text = lineData.text || '';
            const indent = lineData.indent || 0;
            const highlight = lineData.highlight || false;
            addLineElement();
            finalizeLine(text, indent, highlight);
        });
    }
}

// Keep initTerminal for backward compatibility (used in writeup.js modals if needed)
function initTerminal(term) {
    const output = document.getElementById('term-output');
    const input = document.getElementById('term-input');
    if (!output || !input) return;

    let cmdIndex = 0;
    let charIndex = 0;
    let currentLine = '';
    let history = [];
    let historyIndex = -1;

    function typeNext() {
        if (cmdIndex >= term.commands.length) {
            setTimeout(() => { input.disabled = false; input.focus(); }, 500);
            return;
        }

        const item = term.commands[cmdIndex];

        if (item.cmd) {
            const cmd = item.cmd;
            if (charIndex < cmd.length) {
                currentLine += cmd[charIndex];
                charIndex++;
                renderOutput(term.prompt + ' ' + currentLine + '_');
                setTimeout(typeNext, term.typeSpeed);
            } else {
                renderOutput(term.prompt + ' ' + currentLine);
                currentLine = '';
                charIndex = 0;
                cmdIndex++;
                setTimeout(typeNext, item.delay || term.lineDelay);
            }
        } else if (item.output !== undefined) {
            const line = document.createElement('div');
            line.className = 'term-line' + (item.vuln ? ' vuln' : '');
            line.textContent = item.output;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
            cmdIndex++;
            setTimeout(typeNext, item.delay || term.lineDelay);
        }
    }

    function renderOutput(text) {
        const lines = output.querySelectorAll('.term-line');
        if (lines.length && text.endsWith('_') && text.startsWith(term.prompt)) {
            lines[lines.length - 1].textContent = text;
        } else {
            const line = document.createElement('div');
            line.className = 'term-line';
            line.textContent = text;
            output.appendChild(line);
        }
        output.scrollTop = output.scrollHeight;
    }

    if (CONFIG.animation && CONFIG.animation.enabled !== false) {
        setTimeout(typeNext, 800);
    } else {
        term.commands.forEach((item) => {
            if (item.cmd) {
                const line = document.createElement('div');
                line.className = 'term-line';
                line.textContent = term.prompt + ' ' + item.cmd;
                output.appendChild(line);
            } else if (item.output !== undefined) {
                const line = document.createElement('div');
                line.className = 'term-line' + (item.vuln ? ' vuln' : '');
                line.textContent = item.output;
                output.appendChild(line);
            }
        });
        input.disabled = false;
        input.focus();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value.trim();
            if (!cmd) return;

            const line = document.createElement('div');
            line.className = 'term-line';
            line.textContent = term.prompt + ' ' + cmd;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;

            history.push(cmd);
            historyIndex = history.length;
            input.value = '';

            const lower = cmd.toLowerCase();
            if (term.interactive && term.interactive[lower] !== undefined) {
                const response = term.interactive[lower];
                if (response === '__CLEAR__') {
                    output.innerHTML = '';
                } else {
                    const respLine = document.createElement('div');
                    respLine.className = 'term-line';
                    respLine.textContent = response;
                    output.appendChild(respLine);
                }
            } else if (lower === 'clear') {
                output.innerHTML = '';
            } else if (lower === 'exit') {
                const respLine = document.createElement('div');
                respLine.className = 'term-line';
                respLine.textContent = term.interactive?.exit || 'Connection closed. Refresh page to restart.';
                output.appendChild(respLine);
                input.disabled = true;
            } else if (lower === 'help') {
                const respLine = document.createElement('div');
                respLine.className = 'term-line';
                respLine.textContent = term.interactive?.help || 'Available: nmap, sqlmap, ffuf, gobuster, nikto, whois, dig, curl, wget, cat, ls, cd, pwd, whoami, id, uname, ps, netstat, ss, ip, ping, traceroute, nslookup, host, dig, whois, clear, help, exit';
                output.appendChild(respLine);
            } else {
                const respLine = document.createElement('div');
                respLine.className = 'term-line';
                respLine.textContent = `Command not found: ${cmd}. Type 'help' for available commands.`;
                output.appendChild(respLine);
            }
            output.scrollTop = output.scrollHeight;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = history[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                input.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                input.value = '';
            }
        }
    });
}

function renderLiveStatus() {
    const badge = document.getElementById('live-badge');
    if (!badge || !CONFIG.liveStatus?.enabled) return;

    const platforms = CONFIG.liveStatus.platforms?.join(' · ') || 'HackerOne & Bugcrowd';
    badge.innerHTML = `<a href="${escapeHtml(CONFIG.liveStatus.link)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;display:flex;align-items:center;gap:8px;">${escapeHtml(CONFIG.liveStatus.text)} <span style="opacity:0.6;font-size:11px;">(${platforms})</span></a>`;
    badge.style.display = 'flex';
}

function renderHeroStats() {
    const stats = CONFIG.stats;
    if (!stats) return;
    // Stats rendered in dashboard card
}

function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');

        if (CONFIG.ui?.navbarHideOnScroll) {
            if (currentScroll > lastScroll && currentScroll > 100) navbar.classList.add('hidden');
            else navbar.classList.remove('hidden');
        }
        lastScroll = currentScroll;

        // Active link highlighting
        const sections = document.querySelectorAll('section[id]');
        let active = '';
        sections.forEach((section) => {
            const top = section.offsetTop - 120;
            const bottom = top + section.offsetHeight;
            if (currentScroll >= top && currentScroll < bottom) active = section.id;
        });
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + active);
        });
    });

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            const expanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', String(!expanded));
            navLinks.classList.toggle('open');
        });

        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.setAttribute('aria-expanded', 'false');
                navLinks.classList.remove('open');
            });
        });
    }
}

function initParticles() {
    if (!CONFIG.ui?.enableParticles) return;

    const canvas = document.getElementById('particles-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const count = CONFIG.animation?.particleCount || 40;
    const speed = CONFIG.animation?.particleSpeed || 0.4;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.4 + 0.05
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg-primary').trim() || '#ffffff';

        particles.forEach((p) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = fg.replace('rgb', 'rgba').replace(')', `, ${p.alpha})`).replace('(', '(');
            ctx.fill();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = fg.replace('rgb', 'rgba').replace(')', `, ${0.03 * (1 - dist / 100)})`).replace('(', '(');
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate();
}

function initScrollReveal() {
    if (!CONFIG.animation || CONFIG.animation.enabled === false) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: CONFIG.animation.sectionRevealThreshold || 0.1 });

    document.querySelectorAll('.section').forEach((section) => {
        section.classList.add('reveal');
        observer.observe(section);
    });
}

function initLanguageToggle() {
    const toggle = document.getElementById('lang-toggle');
    if (!toggle || !CONFIG.i18n || CONFIG.i18n.enabled === false) return;

    const buttons = toggle.querySelectorAll('.lang-btn');
    const savedLang = localStorage.getItem('lang') || CONFIG.i18n.default || 'en';

    function applyLang(lang) {
        const translations = CONFIG.i18n.translations?.[lang];
        if (!translations) return;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                    el.placeholder = translations[key];
                } else {
                    el.textContent = translations[key];
                }
            }
        });

        buttons.forEach((btn) => {
            const isActive = btn.dataset.lang === lang;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        localStorage.setItem('lang', lang);
        document.documentElement.lang = lang;
    }

    toggle.style.display = 'flex';
    applyLang(savedLang);

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => applyLang(btn.dataset.lang));
    });
}

function copyPGP() {
    const pre = document.querySelector('.pgp-block pre');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => {
        const btn = document.querySelector('.pgp-block .btn-copy');
        if (btn) {
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = original; }, 2000);
        }
    });
}
window.copyPGP = copyPGP;

/* ── Boot ──────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSEO();
    initAnalytics();
    initNavbar();
    initParticles();
    initScrollReveal();
    initLanguageToggle();

    renderAbout();
    renderSkills();
    renderProjects();
    renderBlog();
    renderTools();
    renderTimeline();
    renderCertifications();
    renderHallOfFame();
    renderTalks();
    renderTestimonials();
    renderContact();
    renderFooter();
    renderDashboard();
    renderHeroStats();
    renderLiveStatus();

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
});