/**
 * ABOG Integration - JavaScript Vanilla
 * Version: 3.0.1 (Integrado com envio Kommo AJAX)
 */

const ABOG = {
    // Configuração
    config: {
        apiCourses: '',
        apiTeachers: '',
        apiClassifieds: '',
        timeout: 20000,
        ajaxUrl: null,
        proxyApiCourses: null,
        proxyApiTeachers: null,
        proxyApiClassifieds: null,
        kommoLeadUrl: null,
        painelBaseUrl: 'https://painel.abogoias.org.br', // URL base do painel (configurável via PHP)
    },

    // Módulo de Cursos
    courses: {
        data: [],
        allData: [], // Store all courses for filtering
        container: null,
        loading: null,
        grid: null,
        filters: {
            area: '',
            modality: '',
            targetAudience: ''
        },
        sortBy: 'start_date_asc', // Default: upcoming courses first
        filterOptions: null,

        init() {
            this.container = document.getElementById('abog-courses-container');
            if (!this.container) return;

            console.debug('[ABOG] courses.init - apiCourses:', ABOG.config.apiCourses);

            // If the API URL isn't configured, avoid stuck loader
            if (!ABOG.config.apiCourses || typeof ABOG.config.apiCourses !== 'string' || !ABOG.config.apiCourses.startsWith('http')) {
                console.error('[ABOG] courses: API URL is not configured, cannot load courses:', ABOG.config.apiCourses);
                this.showError('Erro de configuração: API de cursos não configurada.');
                return;
            }

            this.loading = document.getElementById('abog-courses-loading');
            this.grid = document.getElementById('abog-courses-grid');
            this.initFilters();
            this.load();
            // Fallback: se após 12s nada carregou, esconda o loader e mostre erro
            setTimeout(() => {
                if (this.loading && this.loading.style.display !== 'none') {
                    console.warn('[ABOG] courses: fallback timeout reached - hiding loader');
                    this.showError('Erro ao carregar cursos. Tente novamente.');
                }
            }, 12000);
        },

        initFilters() {
            const areaSelect = document.getElementById('filter-area');
            const modalitySelect = document.getElementById('filter-modality');
            const audienceSelect = document.getElementById('filter-audience');
            const sortSelect = document.getElementById('sort-by');
            const clearBtn = document.getElementById('abog-clear-filters');

            if (areaSelect) {
                areaSelect.addEventListener('change', (e) => {
                    this.filters.area = e.target.value;
                    this.applyFilters();
                });
            }
            if (modalitySelect) {
                modalitySelect.addEventListener('change', (e) => {
                    this.filters.modality = e.target.value;
                    this.applyFilters();
                });
            }
            if (audienceSelect) {
                audienceSelect.addEventListener('change', (e) => {
                    this.filters.targetAudience = e.target.value;
                    this.applyFilters();
                });
            }
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortBy = e.target.value;
                    this.applyFilters();
                });
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearFilters();
                });
            }
        },

        populateFilterOptions() {
            const areaSelect = document.getElementById('filter-area');
            const modalitySelect = document.getElementById('filter-modality');
            const audienceSelect = document.getElementById('filter-audience');

            if (areaSelect && this.filterOptions && this.filterOptions.areas) {
                this.filterOptions.areas.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area;
                    option.textContent = area;
                    areaSelect.appendChild(option);
                });
            }

            // Fixed modalities
            if (modalitySelect) {
                const fixedModalities = [
                    { value: 'Especialização', label: 'Especialização' },
                    { value: 'Aperfeiçoamento', label: 'Aperfeiçoamento' },
                    { value: 'Imersão', label: 'Imersão' },
                    { value: 'Workshop', label: 'Workshop' },
                    { value: 'Palestra', label: 'Palestra' }
                ];
                fixedModalities.forEach(m => {
                    const option = document.createElement('option');
                    option.value = m.value;
                    option.textContent = m.label;
                    modalitySelect.appendChild(option);
                });
            }

            if (audienceSelect && this.filterOptions && this.filterOptions.targetAudiences) {
                this.filterOptions.targetAudiences.forEach(t => {
                    const option = document.createElement('option');
                    option.value = t.value;
                    option.textContent = t.label;
                    audienceSelect.appendChild(option);
                });
            }
        },

        applyFilters() {
            const clearBtn = document.getElementById('abog-clear-filters');
            const hasFilters = this.filters.area || this.filters.modality || this.filters.targetAudience;
            
            if (clearBtn) {
                clearBtn.style.display = hasFilters ? 'block' : 'none';
            }

            this.data = this.allData.filter(course => {
                if (this.filters.area && course.area !== this.filters.area) return false;
                if (this.filters.modality && course.modality !== this.filters.modality) return false;
                if (this.filters.targetAudience && course.target_audience !== this.filters.targetAudience) return false;
                return true;
            });

            // Apply sorting
            this.sortData();

            this.render();
        },

        sortData() {
            const getStartDate = (course) => {
                const dateStr = course.effective_start_date || (course.suggested_start_date && course.suggested_start_date[0]) || null;
                if (!dateStr) return null;
                return new Date(dateStr + 'T00:00:00');
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            // Classify: 0 = open (future date), 1 = immediate start (<3 months past), 2 = waiting list (>3 months past), 3 = no date
            const getCategory = (course) => {
                // Manual override takes priority
                if (course.display_status) {
                    switch (course.display_status) {
                        case 'open': return 0;
                        case 'immediate_start': return 1;
                        case 'waiting_list': return 2;
                        case 'full': return 2; // treat full same as waiting list for sorting
                    }
                }
                const date = getStartDate(course);
                if (!date) return 3;
                if (date > today) return 0; // open
                if (date > threeMonthsAgo) return 1; // immediate start
                return 2; // waiting list
            };

            this.data.sort((a, b) => {
                switch (this.sortBy) {
                    case 'start_date_asc': {
                        const catA = getCategory(a);
                        const catB = getCategory(b);
                        if (catA !== catB) return catA - catB;
                        const dateA = getStartDate(a);
                        const dateB = getStartDate(b);
                        if (!dateA && !dateB) return 0;
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        return dateA - dateB;
                    }
                    case 'start_date_desc': {
                        const dateA = getStartDate(a);
                        const dateB = getStartDate(b);
                        if (!dateA && !dateB) return 0;
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        return dateB - dateA;
                    }
                    case 'investment_asc':
                        return (a.investment || 0) - (b.investment || 0);
                    case 'investment_desc':
                        return (b.investment || 0) - (a.investment || 0);
                    case 'area_asc':
                        return (a.area || '').localeCompare(b.area || '', 'pt-BR');
                    case 'area_desc':
                        return (b.area || '').localeCompare(a.area || '', 'pt-BR');
                    default:
                        return 0;
                }
            });
        },

        clearFilters() {
            this.filters = { area: '', modality: '', targetAudience: '' };
            this.sortBy = 'start_date_asc'; // Reset to default sort
            
            const areaSelect = document.getElementById('filter-area');
            const modalitySelect = document.getElementById('filter-modality');
            const audienceSelect = document.getElementById('filter-audience');
            const sortSelect = document.getElementById('sort-by');
            const clearBtn = document.getElementById('abog-clear-filters');

            if (areaSelect) areaSelect.value = '';
            if (modalitySelect) modalitySelect.value = '';
            if (audienceSelect) audienceSelect.value = '';
            if (sortSelect) sortSelect.value = 'start_date_asc';
            if (clearBtn) clearBtn.style.display = 'none';

            this.data = [...this.allData];
            this.sortData(); // Apply default sorting
            this.render();
        },

        async load(retryCount = 0) {
            const maxRetries = 3;
            const retryDelay = 1500; // 1.5 seconds between retries
            
            try {
                // Load with filters=true to get filter options
                const url = ABOG.config.apiCourses + '?filters=true';
                console.debug('[ABOG] courses.load - fetching', url, retryCount > 0 ? `(retry ${retryCount})` : '');
                let response = null;
                try {
                    response = await fetch(url, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (err) {
                    console.warn('[ABOG] courses.load - direct fetch failed, will try proxy if available', err);
                    response = null;
                }

                // If direct failed or got 502/503, try proxy
                if ((!response || response.status === 502 || response.status === 503) && ABOG.config.proxyApiCourses) {
                    console.debug('[ABOG] courses.load - trying proxy endpoint', ABOG.config.proxyApiCourses + '&filters=true');
                    response = await fetch(ABOG.config.proxyApiCourses + '&filters=true', { method: 'GET' });
                }

                if (!response) throw new Error('No response from courses endpoint');

                // Retry on 502/503 errors (cold start issues)
                if ((response.status === 502 || response.status === 503 || response.status === 504) && retryCount < maxRetries) {
                    console.warn(`[ABOG] courses.load - got ${response.status}, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }

                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    throw new Error('Erro na requisição: ' + response.status + ' ' + txt);
                }

                const json = await response.json();
                
                if (json && json.success && json.data) {
                    this.allData = json.data;
                    this.data = [...json.data];
                    if (json.filters) {
                        this.filterOptions = json.filters;
                        this.populateFilterOptions();
                    }
                } else if (Array.isArray(json)) {
                    this.allData = json;
                    this.data = [...json];
                } else {
                    throw new Error('Dados inválidos');
                }
                // Apply default sorting (upcoming courses first)
                this.sortData();
                this.render();
            } catch (error) {
                console.error('Erro ao carregar cursos:', error);
                // Retry on network errors
                if (retryCount < maxRetries) {
                    console.warn(`[ABOG] courses.load - error, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }
                this.showError('Erro ao carregar cursos. Tente novamente.');
            }
        },

        render() {
            this.loading.style.display = 'none';
            
            if (this.data.length === 0) {
                this.grid.innerHTML = '<p class="abog-empty">Nenhum curso disponível no momento.</p>';
                return;
            }

            this.grid.innerHTML = this.data.map(course => {
                const startDate = course.effective_start_date || (course.suggested_start_date && course.suggested_start_date[0]) || null;
                const formattedDate = startDate ? this.formatDate(startDate) : 'A definir';
                
                // Identificar tipo de curso pelo título ou pelo campo modalidade
                const tTitle = (course.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const tModality = (course.modality || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const tArea = (course.area || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                const getCourseType = (str) => {
                    if (str.includes("especializacion") || str.includes("especializacao")) return "Especialização";
                    if (str.includes("aperfeicoamento")) return "Aperfeiçoamento";
                    if (str.includes("imersao")) return "Imersão";
                    if (str.includes("workshop")) return "Workshop";
                    if (str.includes("palestra")) return "Palestra";
                    return "";
                };

                const courseType = getCourseType(tTitle) || getCourseType(tModality) || getCourseType(tArea);
                const typeSlug = courseType ? courseType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '') : '';
                
                // Determinar se devemos mostrar a área no topo (parte azul)
                // Se a área for apenas o tipo do curso (ex: "Especialização"), não mostramos no topo
                const showAreaBadge = course.area && !getCourseType(tArea);

                // Determinar se mostramos a modalidade como item de info (ex: "Presencial")
                // Se a modalidade for o tipo do curso, ela será mostrada como o badge colorido no final
                const showModalityItem = course.modality && !getCourseType(tModality) && course.modality !== courseType;

                // Resolve display status: manual override > auto-calculated
                let dateDisplay, dateClass;
                const manualStatus = course.display_status;
                if (manualStatus === 'full' || course.available_vacancies === 0) {
                    dateDisplay = 'Curso Lotado';
                    dateClass = 'abog-course-date abog-course-full';
                } else if (manualStatus === 'waiting_list' || (!manualStatus && this.isWaitingList(startDate))) {
                    dateDisplay = 'Lista de espera';
                    dateClass = 'abog-course-date abog-waiting-list';
                } else if (manualStatus === 'immediate_start' || (!manualStatus && this.isImmediateStart(startDate))) {
                    dateDisplay = 'Início imediato';
                    dateClass = 'abog-course-date abog-immediate-start';
                } else if (manualStatus === 'open') {
                    dateDisplay = `Início: ${formattedDate}`;
                    dateClass = 'abog-course-date';
                } else {
                    dateDisplay = `Início: ${formattedDate}`;
                    dateClass = 'abog-course-date';
                }
                
                return `
                    <div class="abog-course-card" data-course-id="${course.id}">
                        <div class="abog-card-image" style="background-image: url('${course.photo_1_url}')"></div>
                        <div class="abog-card-content">
                            <div class="abog-badge-row">
                                ${showAreaBadge ? `<span class="abog-badge">${course.area}</span>` : ''}
                            </div>
                            <h3 class="abog-card-title">${course.title}</h3>
                            <div class="abog-card-info">
                                ${showModalityItem ? `
                                <span class="abog-info-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2v20M2 12h20"/>
                                    </svg>
                                    ${course.modality}
                                </span>` : ''}
                                <span class="abog-info-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M12 6v6l4 2"/>
                                    </svg>
                                    ${course.workload}h
                                </span>
                                ${courseType ? `<span class="abog-info-item abog-badge-type abog-badge-type-${typeSlug}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="8" r="7"/>
                                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                                    </svg>
                                    ${courseType}
                                </span>` : ''}
                            </div>
                            <div class="abog-card-footer">
                                <span class="${dateClass}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    ${dateDisplay}
                                </span>
                                ${course.available_vacancies === 0 ? '<span class="abog-vacancies abog-course-full">Curso Lotado</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Adicionar evento de click nos cards
            this.grid.querySelectorAll('.abog-course-card').forEach(card => {
                card.addEventListener('click', () => {
                    const courseId = card.dataset.courseId;
                    this.openModal(courseId);
                });
            });
        },

        openModal(courseId) {
            const course = this.data.find(c => c.id === courseId);
            if (!course) return;

            const baseUrl = ABOG.config.painelBaseUrl || 'https://painel.abogoias.org.br';

            // Always redirect to painel URL (public_url may point to old domain)
            let slug = course.slug || course.id;
            if (!course.slug && course.public_url) {
                try {
                    const u = new URL(course.public_url);
                    const parts = u.pathname.split('/').filter(Boolean);
                    const idx = parts.indexOf('curso');
                    if (idx >= 0 && parts[idx + 1]) slug = parts[idx + 1];
                } catch (e) {
                    // ignore parse errors
                }
            }

            window.open(`${baseUrl}/curso/${slug}`, '_blank');
        },

        formatDate(dateStr) {
            if (!dateStr || dateStr === 'A definir') return 'A definir';
            try {
                // Parse date as local time to avoid timezone shift
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const [year, month, day] = parts.map(Number);
                    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                }
                // Fallback for other formats
                const date = new Date(dateStr + 'T00:00:00');
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch {
                return dateStr;
            }
        },

        isImmediateStart(dateStr) {
            if (!dateStr || dateStr === 'A definir') return false;
            try {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const [year, month, day] = parts.map(Number);
                    const startDate = new Date(year, month - 1, day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return startDate <= today;
                }
                return false;
            } catch {
                return false;
            }
        },

        isWaitingList(dateStr) {
            if (!dateStr || dateStr === 'A definir') return false;
            try {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const [year, month, day] = parts.map(Number);
                    const startDate = new Date(year, month - 1, day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (startDate > today) return false;
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    return startDate <= threeMonthsAgo;
                }
                return false;
            } catch {
                return false;
            }
        },

        showError(message) {
            this.loading.style.display = 'none';
            this.grid.innerHTML = `<p class="abog-error">${message}</p>`;
        }
    },

    // Módulo de Próximos Cursos
    upcoming: {
        data: [],
        container: null,
        loading: null,
        list: null,

        init() {
            this.container = document.getElementById('abog-upcoming-courses-container');
            if (!this.container) return;

            this.loading = document.getElementById('abog-upcoming-courses-loading');
            this.list = document.getElementById('abog-upcoming-courses-list');
            this.load();
        },

        async load(retryCount = 0) {
            const maxRetries = 3;
            const retryDelay = 1500;
            
            try {
                console.debug('[ABOG] upcoming.load - fetching', ABOG.config.apiCourses + '?upcoming=true', retryCount > 0 ? `(retry ${retryCount})` : '');
                let response = null;
                try {
                    response = await fetch(ABOG.config.apiCourses + '?upcoming=true', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (err) {
                    console.warn('[ABOG] upcoming.load - direct fetch failed, trying proxy', err);
                    response = null;
                }

                if ((!response || response.status === 502 || response.status === 503) && ABOG.config.proxyApiCourses) {
                    response = await fetch(ABOG.config.proxyApiCourses + '&upcoming=true', { method: 'GET' });
                }

                if (!response) throw new Error('No response from upcoming endpoint');

                // Retry on 502/503 errors
                if ((response.status === 502 || response.status === 503 || response.status === 504) && retryCount < maxRetries) {
                    console.warn(`[ABOG] upcoming.load - got ${response.status}, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }

                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    throw new Error('Erro na requisição: ' + response.status + ' ' + txt);
                }

                const json = await response.json();
                
                if (json && json.success && json.data) {
                    this.data = json.data;
                } else if (Array.isArray(json)) {
                    this.data = json;
                } else {
                    throw new Error('Dados inválidos');
                }
                this.render();
            } catch (error) {
                console.error('Erro ao carregar próximos cursos:', error);
                if (retryCount < maxRetries) {
                    console.warn(`[ABOG] upcoming.load - error, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }
                this.showError('Erro ao carregar próximos cursos. Tente novamente.');
            }
        },

        getCategoryOrder(course) {
            const manualStatus = course.display_status;
            const startDateRaw = course.effective_start_date || null;
            if (manualStatus === 'full') return 4;
            if (manualStatus === 'waiting_list' || (!manualStatus && ABOG.courses.isWaitingList && ABOG.courses.isWaitingList(startDateRaw))) return 3;
            if (manualStatus === 'immediate_start' || (!manualStatus && ABOG.courses.isImmediateStart(startDateRaw))) return 2;
            return 1; // open future
        },

        render() {
            this.loading.style.display = 'none';
            
            if (this.data.length === 0) {
                this.list.innerHTML = '<li class="abog-empty">Nenhum curso programado no momento.</li>';
                return;
            }

            // Sort by category (open > immediate > waiting > full), then by date
            const sorted = [...this.data].sort((a, b) => {
                const ca = this.getCategoryOrder(a);
                const cb = this.getCategoryOrder(b);
                if (ca !== cb) return ca - cb;
                const da = a.effective_start_date || '9999-12-31';
                const db = b.effective_start_date || '9999-12-31';
                return da.localeCompare(db);
            });

            const INITIAL_VISIBLE = 6;
            const buildItem = (course) => {
                const startDateRaw = course.effective_start_date || null;
                const startDateFormatted = startDateRaw ? ABOG.courses.formatDate(startDateRaw) : 'A definir';
                const manualStatus = course.display_status;
                let dateDisplay, dateClass;
                if (manualStatus === 'immediate_start' || (!manualStatus && ABOG.courses.isImmediateStart(startDateRaw))) {
                    dateDisplay = 'Início imediato';
                    dateClass = 'abog-upcoming-item-date abog-immediate-start';
                } else if (manualStatus === 'waiting_list' || (!manualStatus && ABOG.courses.isWaitingList && ABOG.courses.isWaitingList(startDateRaw))) {
                    dateDisplay = 'Lista de espera';
                    dateClass = 'abog-upcoming-item-date abog-waiting-list';
                } else if (manualStatus === 'full') {
                    dateDisplay = 'Curso Lotado';
                    dateClass = 'abog-upcoming-item-date abog-course-full';
                } else {
                    dateDisplay = startDateFormatted;
                    dateClass = 'abog-upcoming-item-date';
                }
                return `
                    <li class="abog-upcoming-item" data-course-id="${course.id}">
                        <span class="abog-upcoming-item-name">${course.title}</span>
                        <span class="${dateClass}">${dateDisplay}</span>
                    </li>
                `;
            };

            const visibleItems = sorted.slice(0, INITIAL_VISIBLE).map(buildItem).join('');
            const hiddenItems = sorted.slice(INITIAL_VISIBLE).map(buildItem).join('');
            const hasMore = sorted.length > INITIAL_VISIBLE;

            this.list.innerHTML = visibleItems
                + (hasMore ? `<li class="abog-upcoming-hidden" style="display:none;padding:0;border:none;">${hiddenItems}</li>` : '');

            // Wrap with see-more button if needed
            const parent = this.list.parentElement;
            const oldBtn = parent && parent.querySelector('.abog-upcoming-see-more');
            if (oldBtn) oldBtn.remove();
            if (hasMore && parent) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'abog-upcoming-see-more';
                btn.textContent = `Ver mais (${sorted.length - INITIAL_VISIBLE})`;
                btn.addEventListener('click', () => {
                    const hidden = this.list.querySelector('.abog-upcoming-hidden');
                    if (!hidden) return;
                    const expanded = hidden.style.display !== 'none';
                    if (expanded) {
                        hidden.style.display = 'none';
                        btn.textContent = `Ver mais (${sorted.length - INITIAL_VISIBLE})`;
                    } else {
                        hidden.style.display = 'contents';
                        btn.textContent = 'Ver menos';
                    }
                });
                parent.appendChild(btn);
            }

            // Click handlers
            this.list.querySelectorAll('.abog-upcoming-item').forEach(item => {
                item.addEventListener('click', () => {
                    const courseId = item.dataset.courseId;
                    this.openModal(courseId);
                });
            });
        },

        openModal(courseId) {
            const course = this.data.find(c => c.id === courseId);
            if (!course) return;

            const baseUrl = ABOG.config.painelBaseUrl || 'https://painel.abogoias.org.br';

            // Always redirect to painel URL (public_url may point to old domain)
            let slug = course.slug || course.id;
            if (!course.slug && course.public_url) {
                try {
                    const u = new URL(course.public_url);
                    const parts = u.pathname.split('/').filter(Boolean);
                    const idx = parts.indexOf('curso');
                    if (idx >= 0 && parts[idx + 1]) slug = parts[idx + 1];
                } catch (e) {
                    // ignore parse errors
                }
            }

            window.open(`${baseUrl}/curso/${slug}`, '_blank');
        },

        showError(message) {
            this.loading.style.display = 'none';
            this.list.innerHTML = `<li class="abog-error">${message}</li>`;
        }
    },

    // Modal module removed - courses now redirect to public page

    // Módulo de Professores
    teachers: {
        data: [],
        container: null,
        loading: null,
        wrapper: null,
        swiper: null,

        init() {
            this.container = document.getElementById('abog-teachers-container');
            if (!this.container) return;

            this.loading = document.getElementById('abog-teachers-loading');
            this.wrapper = document.getElementById('abog-teachers-wrapper');
            this.load();
        },

        async load(retryCount = 0) {
            const maxRetries = 3;
            const retryDelay = 1500;
            
            try {
                console.debug('[ABOG] teachers.load - fetching', ABOG.config.apiTeachers, retryCount > 0 ? `(retry ${retryCount})` : '');
                let response = null;
                try {
                    response = await fetch(ABOG.config.apiTeachers, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                } catch (err) {
                    console.warn('[ABOG] teachers.load - direct fetch failed, trying proxy', err);
                    response = null;
                }

                if ((!response || response.status === 502 || response.status === 503) && ABOG.config.proxyApiTeachers) {
                    response = await fetch(ABOG.config.proxyApiTeachers, { method: 'GET' });
                }

                if (!response) throw new Error('No response from teachers endpoint');

                // Retry on 502/503 errors
                if ((response.status === 502 || response.status === 503 || response.status === 504) && retryCount < maxRetries) {
                    console.warn(`[ABOG] teachers.load - got ${response.status}, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }

                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    throw new Error('Erro na requisição: ' + response.status + ' ' + txt);
                }

                const json = await response.json();
                
                if (json && json.success && json.data) {
                    this.data = json.data;
                } else if (Array.isArray(json)) {
                    this.data = json;
                } else {
                    throw new Error('Dados inválidos');
                }
                this.render();
            } catch (error) {
                console.error('Erro ao carregar professores:', error);
                if (retryCount < maxRetries) {
                    console.warn(`[ABOG] teachers.load - error, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }
                this.showError('Erro ao carregar professores. Tente novamente.');
            }
        },

        render() {
            this.loading.style.display = 'none';
            
            if (this.data.length === 0) {
                this.wrapper.innerHTML = '<p class="abog-empty">Nenhum professor disponível no momento.</p>';
                return;
            }

            this.wrapper.innerHTML = this.data.map(teacher => {
                const specialties = teacher.specialties && teacher.specialties.length > 0 
                    ? teacher.specialties.join(', ') 
                    : 'Não informado';
                const bio = teacher.bio ? (teacher.bio.length > 150 ? teacher.bio.substring(0, 150) + '...' : teacher.bio) : '';
                
                return `
                    <div class="swiper-slide">
                        <div class="abog-teacher-card">
                            <div class="abog-teacher-photo" style="background-image: url('${teacher.photo_url || 'https://via.placeholder.com/150'}')"></div>
                            <div class="abog-teacher-info">
                                <h3 class="abog-teacher-name">${teacher.name}</h3>
                                ${teacher.cro ? `<p class="abog-teacher-cro">📋 CRO: ${teacher.cro}</p>` : ''}
                                <p class="abog-teacher-specialties">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    ${specialties}
                                </p>
                                ${bio ? `<p class="abog-teacher-bio">${bio}</p>` : ''}
                                <div class="abog-teacher-contacts">
                                    ${teacher.email ? `
                                        <a href="mailto:${teacher.email}" class="abog-teacher-contact">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                <polyline points="22,6 12,13 2,6"/>
                                            </svg>
                                            ${teacher.email}
                                        </a>
                                    ` : ''}
                                    ${teacher.phone ? `
                                        <a href="tel:${teacher.phone}" class="abog-teacher-contact">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                            </svg>
                                            ${teacher.phone}
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Inicializar Swiper
            setTimeout(() => {
                this.swiper = new Swiper('.abog-teachers-swiper', {
                    slidesPerView: 1,
                    spaceBetween: 24,
                    loop: this.data.length > 3,
                    autoplay: {
                        delay: 4000,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true
                    },
                    pagination: {
                        el: '.swiper-pagination',
                        clickable: true
                    },
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev'
                    },
                    breakpoints: {
                        640: { slidesPerView: 2, spaceBetween: 20 },
                        1024: { slidesPerView: 3, spaceBetween: 24 }
                    }
                });
            }, 100);
        },

        showError(message) {
            this.loading.style.display = 'none';
            this.wrapper.innerHTML = `<p class="abog-error">${message}</p>`;
        }
    },

    // Módulo de Classificados
    classifieds: {
        data: [],
        container: null,
        loading: null,
        grid: null,
        currentPage: 0,
        itemsPerPage: 10,

        init() {
            this.container = document.getElementById('abog-classifieds-container');
            if (!this.container) return;

            this.loading = document.getElementById('abog-classifieds-loading');
            this.grid = document.getElementById('abog-classifieds-grid');
            this.load();
        },

        async load(retryCount = 0) {
            const maxRetries = 3;
            const retryDelay = 1500;
            
            try {
                console.debug('[ABOG] classifieds.load - fetching', ABOG.config.apiClassifieds, retryCount > 0 ? `(retry ${retryCount})` : '');
                let response = null;
                try {
                    response = await fetch(ABOG.config.apiClassifieds, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                } catch (err) {
                    console.warn('[ABOG] classifieds.load - direct fetch failed, trying proxy', err);
                    response = null;
                }

                if ((!response || response.status === 502 || response.status === 503) && ABOG.config.proxyApiClassifieds) {
                    response = await fetch(ABOG.config.proxyApiClassifieds, { method: 'GET' });
                }

                if (!response) throw new Error('No response from classifieds endpoint');

                // Retry on 502/503 errors
                if ((response.status === 502 || response.status === 503 || response.status === 504) && retryCount < maxRetries) {
                    console.warn(`[ABOG] classifieds.load - got ${response.status}, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }

                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    throw new Error('Erro na requisição: ' + response.status + ' ' + txt);
                }

                const json = await response.json();
                
                if (json && json.success && json.data) {
                    this.data = json.data;
                } else if (Array.isArray(json)) {
                    this.data = json;
                } else {
                    throw new Error('Dados inválidos');
                }
                this.render();
            } catch (error) {
                console.error('Erro ao carregar classificados:', error);
                if (retryCount < maxRetries) {
                    console.warn(`[ABOG] classifieds.load - error, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.load(retryCount + 1);
                }
                this.showError('Erro ao carregar classificados. Tente novamente.');
            }
        },

        render() {
            this.loading.style.display = 'none';
            
            if (this.data.length === 0) {
                this.grid.innerHTML = '<p class="abog-empty">Nenhum classificado disponível no momento.</p>';
                return;
            }

            const start = this.currentPage * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            const pageData = this.data.slice(start, end);
            const totalPages = Math.ceil(this.data.length / this.itemsPerPage);

            const classifiedsHTML = pageData.map(classified => {
                const description = classified.description.length > 120 
                    ? classified.description.substring(0, 120) + '...' 
                    : classified.description;
                const hasPhoto = classified.photos && classified.photos.length > 0 && classified.photos[0] && classified.photos[0].trim() !== '';
                const photoUrl = hasPhoto ? classified.photos[0] : null;
                const createdDate = new Date(classified.created_at).toLocaleDateString('pt-BR');
                
                return `
                    <div class="abog-classified-card" data-classified-id="${classified.id}" style="cursor: pointer;">
                        ${hasPhoto 
                            ? `<div class="abog-classified-image" style="background-image: url('${photoUrl}')"></div>`
                            : `<div class="abog-classified-image abog-classified-placeholder"><span>Classificados</span></div>`
                        }
                        <div class="abog-classified-content">
                            <span class="abog-classified-category">${this.formatCategory(classified.category)}</span>
                            <h3 class="abog-classified-title">${classified.title}</h3>
                            <p class="abog-classified-description">${description}</p>
                            
                            <div class="abog-classified-details">
                                ${classified.location ? `
                                    <div class="abog-classified-detail">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                        </svg>
                                        ${classified.location}
                                    </div>
                                ` : ''}
                                ${classified.price ? `
                                    <div class="abog-classified-detail abog-classified-price">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="1" x2="12" y2="23"/>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                        </svg>
                                        R$ ${Number(classified.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="abog-classified-footer">
                                <div class="abog-classified-contact">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    ${classified.contact_email}
                                </div>
                                <div class="abog-classified-date">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    ${createdDate}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const paginationHTML = totalPages > 1 ? `
                <div class="abog-pagination">
                    <button class="abog-pagination-btn abog-prev-btn" ${this.currentPage === 0 ? 'disabled' : ''}>‹ Anterior</button>
                    <span class="abog-pagination-info">Página ${this.currentPage + 1} de ${totalPages}</span>
                    <button class="abog-pagination-btn abog-next-btn" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>Próxima ›</button>
                </div>
            ` : '';

            this.grid.innerHTML = `
                <div class="abog-classifieds-grid">
                    ${classifiedsHTML}
                </div>
                ${paginationHTML}
            `;

            // Add click event listeners to cards
            this.grid.querySelectorAll('.abog-classified-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.getAttribute('data-classified-id');
                    this.openModal(id);
                });
            });

            // Add click event listeners to pagination buttons
            const prevBtn = this.grid.querySelector('.abog-prev-btn');
            const nextBtn = this.grid.querySelector('.abog-next-btn');
            if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
            if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        },

        nextPage() {
            const totalPages = Math.ceil(this.data.length / this.itemsPerPage);
            if (this.currentPage < totalPages - 1) {
                this.currentPage++;
                this.render();
            }
        },

        prevPage() {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.render();
            }
        },

        formatCategory(category) {
            const categories = {
                'equipamentos': 'Equipamentos',
                'consultorio': 'Consultório',
                'materiais': 'Materiais',
                'servicos': 'Serviços',
                'vaga': 'Vaga',
                'produto': 'Produto',
                'servico': 'Serviço',
                'outros': 'Outros'
            };
            return categories[category] || category;
        },

        showError(message) {
            this.loading.style.display = 'none';
            this.grid.innerHTML = `<p class="abog-error">${message}</p>`;
        },

        openModal(id) {
            const classified = this.data.find(c => c.id === id);
            if (!classified) return;

            const validPhotos = (classified.photos || []).filter(p => p && p.trim() !== '');
            const hasPhotos = validPhotos.length > 0;
            const createdDate = new Date(classified.created_at).toLocaleDateString('pt-BR');

            const modalHTML = `
                <div class="abog-classified-modal-overlay" onclick="ABOG.classifieds.closeModal(event)">
                    <div class="abog-classified-modal" onclick="event.stopPropagation()">
                        <button class="abog-classified-modal-close" onclick="ABOG.classifieds.closeModal(event)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                        
                        <div class="abog-classified-modal-gallery ${!hasPhotos ? 'abog-classified-placeholder' : ''}">
                            ${hasPhotos ? validPhotos.map((photo, index) => `
                                <img src="${photo}" alt="Foto ${index + 1}" class="abog-classified-modal-image ${index === 0 ? 'active' : ''}" data-index="${index}">
                            `).join('') : '<span>Classificados</span>'}
                            ${hasPhotos && validPhotos.length > 1 ? `
                                <div class="abog-classified-modal-gallery-nav">
                                    ${validPhotos.map((_, index) => `
                                        <button class="abog-classified-modal-gallery-dot ${index === 0 ? 'active' : ''}" onclick="ABOG.classifieds.showPhoto(${index})"></button>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="abog-classified-modal-content">
                            <div class="abog-classified-modal-header">
                                <span class="abog-classified-category">${this.formatCategory(classified.category)}</span>
                                ${classified.price ? `
                                    <span class="abog-classified-modal-price">R$ ${Number(classified.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                ` : ''}
                            </div>
                            
                            <h2 class="abog-classified-modal-title">${classified.title}</h2>
                            
                            <div class="abog-classified-modal-description">
                                <p>${classified.description}</p>
                            </div>
                            
                            <div class="abog-classified-modal-info">
                                ${classified.location ? `
                                    <div class="abog-classified-modal-info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                        </svg>
                                        <span><strong>Localização:</strong> ${classified.location}</span>
                                    </div>
                                ` : ''}
                                <div class="abog-classified-modal-info-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    <span><strong>Publicado em:</strong> ${createdDate}</span>
                                </div>
                            </div>
                            
                            <div class="abog-classified-modal-contact">
                                <h3>Informações de Contato</h3>
                                <div class="abog-classified-modal-contact-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <span>${classified.contact_name}</span>
                                </div>
                                <div class="abog-classified-modal-contact-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    <a href="mailto:${classified.contact_email}">${classified.contact_email}</a>
                                </div>
                                ${classified.contact_phone ? `
                                    <div class="abog-classified-modal-contact-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                        </svg>
                                        <a href="tel:${classified.contact_phone}">${classified.contact_phone}</a>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.querySelector('.abog-classified-modal-overlay');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            document.body.style.overflow = 'hidden';
        },

        closeModal(event) {
            const modal = document.querySelector('.abog-classified-modal-overlay');
            if (modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        },

        showPhoto(index) {
            const images = document.querySelectorAll('.abog-classified-modal-image');
            const dots = document.querySelectorAll('.abog-classified-modal-gallery-dot');
            
            images.forEach((img, i) => {
                img.classList.toggle('active', i === index);
            });
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
    },

    // Módulo de Formulário de Classificados
    classifiedForm: {
        container: null,
        form: null,
        uploadedImages: {}, // Store uploaded image URLs
        
        // Image validation config
        imageConfig: {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
            allowedExtensions: ['jpg', 'jpeg', 'png', 'webp']
        },

        init() {
            this.container = document.getElementById('abog-classifieds-form-container');
            if (!this.container) return;

            this.form = document.getElementById('abog-classified-form');
            if (!this.form) return;

            console.debug('[ABOG] classifiedForm.init');
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.initMasks();
            this.initImageUploads();
        },

        initMasks() {
            const phoneInput = this.form.querySelector('#classified-contact-phone');
            if (phoneInput) {
                phoneInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                        e.target.value = value;
                    }
                });
            }
        },

        initImageUploads() {
            // Initialize image upload handlers for all 3 image fields
            for (let i = 1; i <= 3; i++) {
                const input = document.getElementById(`classified-photo-${i}`);
                const removeBtn = this.form.querySelector(`.abog-image-remove[data-index="${i}"]`);
                
                if (input) {
                    input.addEventListener('change', (e) => this.handleImageSelect(e, i));
                }
                
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => this.removeImage(i));
                }
            }
        },

        validateImage(file) {
            const errors = [];
            
            // Check file type
            if (!this.imageConfig.allowedTypes.includes(file.type)) {
                errors.push('Formato não permitido. Use JPG, PNG ou WEBP.');
            }
            
            // Check file size
            if (file.size > this.imageConfig.maxSize) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                errors.push(`Arquivo muito grande (${sizeMB}MB). Máximo: 5MB.`);
            }
            
            // Check extension
            const ext = file.name.split('.').pop().toLowerCase();
            if (!this.imageConfig.allowedExtensions.includes(ext)) {
                errors.push('Extensão de arquivo inválida.');
            }
            
            return errors;
        },

        handleImageSelect(e, index) {
            const file = e.target.files[0];
            if (!file) return;
            
            const errorDiv = document.getElementById(`error-${index}`);
            const previewDiv = document.getElementById(`preview-${index}`);
            const placeholder = this.form.querySelector(`.abog-image-upload-item[data-index="${index}"] .abog-image-upload-placeholder`);
            const removeBtn = this.form.querySelector(`.abog-image-remove[data-index="${index}"]`);
            
            // Clear previous errors
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            
            // Validate
            const errors = this.validateImage(file);
            if (errors.length > 0) {
                errorDiv.textContent = errors.join(' ');
                errorDiv.style.display = 'block';
                e.target.value = ''; // Clear input
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (event) => {
                previewDiv.innerHTML = `<img src="${event.target.result}" alt="Preview ${index}" />`;
                previewDiv.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        },

        removeImage(index) {
            const input = document.getElementById(`classified-photo-${index}`);
            const previewDiv = document.getElementById(`preview-${index}`);
            const errorDiv = document.getElementById(`error-${index}`);
            const placeholder = this.form.querySelector(`.abog-image-upload-item[data-index="${index}"] .abog-image-upload-placeholder`);
            const removeBtn = this.form.querySelector(`.abog-image-remove[data-index="${index}"]`);
            
            // Clear input and preview
            input.value = '';
            previewDiv.innerHTML = '';
            previewDiv.style.display = 'none';
            placeholder.style.display = 'flex';
            removeBtn.style.display = 'none';
            errorDiv.style.display = 'none';
            
            // Remove from uploaded images
            delete this.uploadedImages[`photo_${index}_url`];
        },

        async uploadImageToStorage(file, index) {
            // These values should be passed via ABOG_CONFIG from WordPress
            const supabaseUrl = ABOG_CONFIG.supabaseUrl || '';
            const supabaseAnonKey = ABOG_CONFIG.supabaseAnonKey || '';
            
            // Generate unique filename
            const ext = file.name.split('.').pop().toLowerCase();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileName = `classifieds/${timestamp}-${randomStr}.${ext}`;
            
            try {
                const response = await fetch(`${supabaseUrl}/storage/v1/object/course-photos/${fileName}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'apikey': supabaseAnonKey,
                        'Content-Type': file.type,
                        'x-upsert': 'true'
                    },
                    body: file
                });
                
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.status}`);
                }
                
                // Return public URL
                return `${supabaseUrl}/storage/v1/object/public/course-photos/${fileName}`;
            } catch (error) {
                console.error(`[ABOG] Image upload failed for photo ${index}:`, error);
                throw error;
            }
        },

        async handleSubmit(e) {
            e.preventDefault();
            
            const btn = this.form.querySelector('.abog-btn-submit');
            const btnText = btn.querySelector('.abog-btn-text');
            const btnLoading = btn.querySelector('.abog-btn-loading');
            const message = this.form.querySelector('.abog-form-message');

            // Collect form data
            const formData = new FormData(this.form);
            const data = {
                title: formData.get('title')?.trim(),
                category: formData.get('category'),
                description: formData.get('description')?.trim(),
                contact_name: formData.get('contact_name')?.trim(),
                contact_email: formData.get('contact_email')?.trim(),
                contact_phone: formData.get('contact_phone')?.trim() || null,
                price: formData.get('price') ? parseFloat(formData.get('price')) : null,
                location: formData.get('location')?.trim() || null
            };

            // Validation
            if (!data.title || data.title.length < 5) {
                this.showMessage(message, 'O título deve ter no mínimo 5 caracteres.', 'error');
                return;
            }
            if (!data.category) {
                this.showMessage(message, 'Selecione uma categoria.', 'error');
                return;
            }
            if (!data.description || data.description.length < 20) {
                this.showMessage(message, 'A descrição deve ter no mínimo 20 caracteres.', 'error');
                return;
            }
            if (!data.contact_name || data.contact_name.length < 3) {
                this.showMessage(message, 'Informe um nome para contato.', 'error');
                return;
            }
            if (!data.contact_email || !this.validateEmail(data.contact_email)) {
                this.showMessage(message, 'Informe um e-mail válido.', 'error');
                return;
            }

            // Loading state
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            message.style.display = 'none';

            try {
                // Upload images first
                this.showMessage(message, 'Enviando imagens...', 'info');
                
                for (let i = 1; i <= 3; i++) {
                    const input = document.getElementById(`classified-photo-${i}`);
                    if (input && input.files && input.files[0]) {
                        try {
                            const url = await this.uploadImageToStorage(input.files[0], i);
                            data[`photo_${i}_url`] = url;
                            console.debug(`[ABOG] Photo ${i} uploaded:`, url);
                        } catch (uploadErr) {
                            console.warn(`[ABOG] Failed to upload photo ${i}:`, uploadErr);
                            // Continue with other uploads
                        }
                    }
                }
                
                this.showMessage(message, 'Enviando anúncio...', 'info');
                
                let response = null;
                let result = null;
                
                // Try WordPress AJAX first (more reliable, avoids CORS)
                if (ABOG.config.createClassifiedUrl) {
                    try {
                        console.debug('[ABOG] classifiedForm - trying WordPress AJAX', ABOG.config.createClassifiedUrl);
                        const ajaxData = new FormData();
                        ajaxData.append('action', 'abog_create_classified');
                        ajaxData.append('data', JSON.stringify(data));

                        response = await fetch(ABOG.config.createClassifiedUrl, {
                            method: 'POST',
                            body: ajaxData
                        });
                        
                        if (response.ok) {
                            result = await response.json();
                            console.debug('[ABOG] classifiedForm - WordPress AJAX response:', result);
                        }
                    } catch (err) {
                        console.warn('[ABOG] classifiedForm - WordPress AJAX failed:', err);
                        response = null;
                    }
                }

                // Fallback to direct API call
                if (!result && ABOG.config.apiCreateClassified) {
                    try {
                        console.debug('[ABOG] classifiedForm - trying direct API', ABOG.config.apiCreateClassified);
                        response = await fetch(ABOG.config.apiCreateClassified, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        
                        if (response.ok) {
                            result = await response.json();
                            console.debug('[ABOG] classifiedForm - Direct API response:', result);
                        }
                    } catch (err) {
                        console.warn('[ABOG] classifiedForm - direct API failed:', err);
                    }
                }

                if (!result) {
                    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
                }

                // Handle WordPress AJAX wrapper format (data.success) or direct format (success)
                const isSuccess = result.success === true || 
                                  (result.data && result.data.success === true);

                if (isSuccess) {
                    this.showMessage(message, 'Anúncio enviado com sucesso! Aguarde a aprovação.', 'success');
                    this.form.reset();
                    // Clear image previews
                    for (let i = 1; i <= 3; i++) {
                        this.removeImage(i);
                    }
                } else {
                    const errorMsg = result.error || result.data?.error || result.message || 'Erro ao enviar anúncio.';
                    throw new Error(errorMsg);
                }

            } catch (error) {
                console.error('[ABOG] Erro ao criar classificado:', error);
                this.showMessage(message, 'Erro ao enviar: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
        },

        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        showMessage(element, text, type) {
            element.textContent = text;
            element.className = `abog-form-message abog-form-message-${type}`;
            element.style.display = 'block';
        }
    },

    // leadForm module removed - form is now on the public course page

    // Patient Form Module
    patientForm: {
        container: null,
        form: null,
        submitBtn: null,
        errorDiv: null,
        successDiv: null,

        init() {
            this.container = document.getElementById('abog-patient-form-container');
            if (!this.container) return;

            this.form = document.getElementById('abog-patient-form');
            this.submitBtn = document.getElementById('patient-submit-btn');
            this.errorDiv = document.getElementById('patient-form-error');
            this.successDiv = document.getElementById('patient-form-success');

            if (this.form) {
                this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            }

            // Phone & CPF masks
            const mobileInput = document.getElementById('patient-mobile-phone');
            const landlineInput = document.getElementById('patient-landline-phone');
            const cpfInput = document.getElementById('patient-cpf');

            if (mobileInput) mobileInput.addEventListener('input', (e) => this.maskPhone(e.target, true));
            if (landlineInput) landlineInput.addEventListener('input', (e) => this.maskPhone(e.target, false));
            if (cpfInput) cpfInput.addEventListener('input', (e) => this.maskCpf(e.target));

            console.log('[ABOG] Patient form initialized');
        },

        maskCpf(input) {
            let v = input.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
            else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
            else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
            input.value = v;
        },

        maskPhone(input, isMobile) {
            let value = input.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length > 0) {
                if (value.length <= 2) {
                    value = `(${value}`;
                } else if (value.length <= 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                } else if (value.length <= 10) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
                } else {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                }
            }
            
            input.value = value;
        },

        showError(message) {
            const errorMsg = document.getElementById('patient-error-message');
            if (errorMsg) errorMsg.textContent = message;
            if (this.errorDiv) this.errorDiv.style.display = 'flex';
        },

        hideError() {
            if (this.errorDiv) this.errorDiv.style.display = 'none';
        },

        showSuccess() {
            if (this.form) this.form.style.display = 'none';
            if (this.successDiv) this.successDiv.style.display = 'block';
        },

        setLoading(loading) {
            if (this.submitBtn) {
                this.submitBtn.disabled = loading;
                if (loading) {
                    this.submitBtn.classList.add('loading');
                } else {
                    this.submitBtn.classList.remove('loading');
                }
            }
        },

        async handleSubmit(e) {
            e.preventDefault();
            this.hideError();
            this.setLoading(true);

            const formData = new FormData(this.form);
            const data = {
                full_name: formData.get('full_name')?.trim() || '',
                cpf: (formData.get('cpf') || '').toString().replace(/\D/g, ''),
                mobile_phone: formData.get('mobile_phone')?.trim() || '',
                landline_phone: formData.get('landline_phone')?.trim() || null,
                gender: formData.get('gender') || '',
                birth_date: formData.get('birth_date') || '',
                state: formData.get('state') || '',
                city: formData.get('city')?.trim() || '',
                message: formData.get('message')?.trim() || ''
            };

            if (!data.cpf || data.cpf.length !== 11) {
                this.showError('Por favor, informe um CPF válido (11 dígitos).');
                this.setLoading(false);
                return;
            }

            // Validation
            if (!data.full_name || data.full_name.length < 2) {
                this.showError('Por favor, informe seu nome completo.');
                this.setLoading(false);
                return;
            }

            const phoneDigits = data.mobile_phone.replace(/\D/g, '');
            if (!phoneDigits || phoneDigits.length < 10) {
                this.showError('Por favor, informe um número de celular válido.');
                this.setLoading(false);
                return;
            }

            if (!data.gender) {
                this.showError('Por favor, selecione o sexo.');
                this.setLoading(false);
                return;
            }

            if (!data.birth_date) {
                this.showError('Por favor, informe sua data de nascimento.');
                this.setLoading(false);
                return;
            }

            if (!data.state) {
                this.showError('Por favor, selecione o estado.');
                this.setLoading(false);
                return;
            }

            if (!data.city || data.city.length < 2) {
                this.showError('Por favor, informe sua cidade.');
                this.setLoading(false);
                return;
            }

            if (!data.message || data.message.length < 10) {
                this.showError('Por favor, descreva o tratamento que você procura (mínimo 10 caracteres).');
                this.setLoading(false);
                return;
            }

            try {
                // Try WordPress proxy first, then direct API
                const url = ABOG.config.createPatientLeadUrl || ABOG.config.apiCreatePatientLead;
                
                if (!url) {
                    throw new Error('URL de API não configurada');
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && (result.success || result.data?.success)) {
                    this.showSuccess();
                } else {
                    const errorMsg = result.error || result.data?.error || 'Erro ao enviar dados. Tente novamente.';
                    this.showError(errorMsg);
                }
            } catch (error) {
                console.error('[ABOG] Patient form error:', error);
                this.showError('Erro de conexão. Por favor, tente novamente.');
            } finally {
                this.setLoading(false);
            }
        }
    },

    // Inicialização
    init() {
        console.log('🚀 ABOG: Inicializando plugin...', {
            configType: typeof ABOG_CONFIG,
            config: ABOG_CONFIG
        });

        if (typeof ABOG_CONFIG === 'undefined') {
            console.error('❌ ABOG_CONFIG não definido');
            return;
        }

        this.config.apiCourses = ABOG_CONFIG.apiCourses;
        this.config.apiTeachers = ABOG_CONFIG.apiTeachers;
        this.config.apiClassifieds = ABOG_CONFIG.apiClassifieds;
        // Admin AJAX URL and nonce for sending leads to Kommo via plugin
        this.config.ajaxUrl = ABOG_CONFIG.ajaxUrl || null;
        // Proxy endpoints (admin-ajax) for server-side fetching to avoid CORS
        this.config.proxyApiCourses = ABOG_CONFIG.proxyApiCourses || null;
        this.config.proxyApiTeachers = ABOG_CONFIG.proxyApiTeachers || null;
        this.config.proxyApiClassifieds = ABOG_CONFIG.proxyApiClassifieds || null;
        this.config.kommoLeadUrl = ABOG_CONFIG.kommoLeadUrl || null;
        this.config.apiCreateClassified = ABOG_CONFIG.apiCreateClassified || null;
        this.config.createClassifiedUrl = ABOG_CONFIG.createClassifiedUrl || null;
        this.config.apiCreatePatientLead = ABOG_CONFIG.apiCreatePatientLead || null;
        this.config.createPatientLeadUrl = ABOG_CONFIG.createPatientLeadUrl || null;
        this.config.painelBaseUrl = ABOG_CONFIG.painelBaseUrl || 'https://painel.abogoias.org.br';

        console.log('✅ ABOG: Config carregada', this.config);

        // Debug: verificar containers
        const containers = {
            courses: !!document.getElementById('abog-courses-container'),
            upcoming: !!document.getElementById('abog-upcoming-courses-container'),
            teachers: !!document.getElementById('abog-teachers-container'),
            classifieds: !!document.getElementById('abog-classifieds-container'),
            patientForm: !!document.getElementById('abog-patient-form-container')
        };
        console.log('📦 ABOG: Containers encontrados:', containers);

        // Inicializar apenas se os containers existirem
        if (containers.courses) {
            try {
                console.log('📚 ABOG: Inicializando módulo courses...');
                this.courses.init();
            } catch (e) {
                console.error('ABOG: error initializing courses module', e);
            }
        }
        
        if (containers.upcoming) {
            try {
                console.log('📅 ABOG: Inicializando módulo upcoming...');
                this.upcoming.init();
            } catch (e) {
                console.error('ABOG: error initializing upcoming module', e);
            }
        }

        if (containers.teachers) {
            try {
                console.log('👨‍🏫 ABOG: Inicializando módulo teachers...');
                this.teachers.init();
            } catch (e) {
                console.error('ABOG: error initializing teachers module', e);
            }
        }

        if (containers.classifieds) {
            try {
                console.log('📰 ABOG: Inicializando módulo classifieds...');
                this.classifieds.init();
            } catch (e) {
                console.error('ABOG: error initializing classifieds module', e);
            }
        }

        // Initialize classifieds form if container exists
        const classifiedFormContainer = document.getElementById('abog-classifieds-form-container');
        if (classifiedFormContainer) {
            try {
                console.log('📝 ABOG: Inicializando módulo classifiedForm...');
                this.classifiedForm.init();
            } catch (e) {
                console.error('ABOG: error initializing classifiedForm module', e);
            }
        }

        // Initialize patient form if container exists
        if (containers.patientForm) {
            try {
                console.log('🏥 ABOG: Inicializando módulo patientForm...');
                this.patientForm.init();
            } catch (e) {
                console.error('ABOG: error initializing patientForm module', e);
            }
        }

        console.log('✨ ABOG: Inicialização completa');
    }
};

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ABOG.init());
} else {
    ABOG.init();
}