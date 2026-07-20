/**
 * React Query Configuration
 * 
 * Defines default cache durations and stale times for different data types
 */

export const QUERY_CONFIG = {
  // Dados que mudam raramente (professores, departamentos)
  STALE_TIME_LONG: 30 * 60 * 1000, // 30 minutos
  CACHE_TIME_LONG: 60 * 60 * 1000, // 1 hora

  // Dados que mudam moderadamente (cursos, classificados)
  STALE_TIME_MEDIUM: 5 * 60 * 1000, // 5 minutos
  CACHE_TIME_MEDIUM: 30 * 60 * 1000, // 30 minutos

  // Dados que mudam frequentemente (validações, leads)
  STALE_TIME_SHORT: 30 * 1000, // 30 segundos
  CACHE_TIME_SHORT: 5 * 60 * 1000, // 5 minutos

  // Dados em tempo real (usuário autenticado)
  STALE_TIME_REAL_TIME: 0, // Sempre stale
  CACHE_TIME_REAL_TIME: 0, // Sem cache
};

/**
 * Hooks com cache configurado por tipo de dados
 */

// Cursos (sincronizado com validações para consistência)
export const courseCacheConfig = {
  staleTime: QUERY_CONFIG.STALE_TIME_SHORT, // 30 segundos - igual às validações
  gcTime: QUERY_CONFIG.CACHE_TIME_SHORT, // 5 minutos
};

// Validações (muda frequentemente)
export const validationCacheConfig = {
  staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  gcTime: QUERY_CONFIG.CACHE_TIME_SHORT,
};

// Classificados (muda moderadamente)
export const classifiedCacheConfig = {
  staleTime: QUERY_CONFIG.STALE_TIME_MEDIUM,
  gcTime: QUERY_CONFIG.CACHE_TIME_MEDIUM,
};

// Professores (muda raramente)
export const teacherCacheConfig = {
  staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  gcTime: QUERY_CONFIG.CACHE_TIME_LONG,
};

// Usuário autenticado (deve refrescar sempre)
export const authCacheConfig = {
  staleTime: QUERY_CONFIG.STALE_TIME_REAL_TIME,
  gcTime: QUERY_CONFIG.CACHE_TIME_REAL_TIME,
};

/**
 * Pagination Configuration
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
