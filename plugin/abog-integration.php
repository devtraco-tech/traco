<?php
/**
 * Plugin Name: ABOG Integration
 * Description: Integração com cursos, professores e classificados da ABOG
 * Version: 3.0.1
 * Author: ABOG
 * Text Domain: abog-integration
 */

if (!defined('ABSPATH')) {
    exit;
}

class ABOG_Integration {
    
    private $api_base_url = '';
    // Kommo configuration - replace token with a secure option in production
    private $kommo_base_url = 'https://cursosabogoiasorgbr.kommo.com/api/v4';
    private $kommo_token = '';
    // Kommo mapping defaults - update according to your Kommo account
    private $kommo_pipeline_id = 10883891;
    private $kommo_status_id = 83466699;
    private $kommo_course_field_id = 997134; // custom field ID for course name
    // plugin no longer forwards leads directly to Kommo; Supabase function handles forwarding
    private $kommo_contact_email_field_id = 263916;
    private $kommo_contact_phone_field_id = 263914;
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        
        // Admin hooks for settings page and registration
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // AJAX Proxy for GET requests (Courses, Teachers, Classifieds)
        add_action('wp_ajax_abog_proxy', array($this, 'ajax_proxy'));
        add_action('wp_ajax_nopriv_abog_proxy', array($this, 'ajax_proxy'));
        
        // AJAX Endpoint for sending Form Lead directly to Kommo
        add_action('wp_ajax_abog_send_kommo_lead', array($this, 'ajax_send_kommo_lead'));
        add_action('wp_ajax_nopriv_abog_send_kommo_lead', array($this, 'ajax_send_kommo_lead'));

        // Admin test endpoint for Kommo
        add_action('admin_post_abog_test_kommo', array($this, 'handle_admin_test_kommo'));
        add_action('admin_post_abog_clear_kommo_logs', array($this, 'handle_admin_clear_kommo_logs'));
        
        // Shortcodes
        add_shortcode('abog_courses', array($this, 'render_courses'));
        add_shortcode('abog_upcoming_courses', array($this, 'render_upcoming_courses'));
        add_shortcode('abog_teachers', array($this, 'render_teachers'));
        add_shortcode('abog_classifieds', array($this, 'render_classifieds'));
        add_shortcode('abog_classifieds_form', array($this, 'render_classifieds_form'));
        add_shortcode('abog_patient_form', array($this, 'render_patient_form'));
        
        // AJAX Endpoint for creating public classifieds
        add_action('wp_ajax_abog_create_classified', array($this, 'ajax_create_classified'));
        add_action('wp_ajax_nopriv_abog_create_classified', array($this, 'ajax_create_classified'));
        
        // AJAX Endpoint for creating patient leads
        add_action('wp_ajax_abog_create_patient_lead', array($this, 'ajax_create_patient_lead'));
        add_action('wp_ajax_nopriv_abog_create_patient_lead', array($this, 'ajax_create_patient_lead'));

        // Load Kommo token and ids from constant or option if available
        if (defined('ABOG_KOMMO_API_TOKEN') && !empty(ABOG_KOMMO_API_TOKEN)) {
            $this->kommo_token = ABOG_KOMMO_API_TOKEN;
        } else {
            $opt = get_option('abog_kommo_bearer_token');
            if (!empty($opt)) $this->kommo_token = $opt;
        }

        // Load Supabase API base URL from constant or option
        if (defined('ABOG_SUPABASE_API_URL') && !empty(ABOG_SUPABASE_API_URL)) {
            $this->api_base_url = ABOG_SUPABASE_API_URL;
        } else {
            $supabaseOpt = get_option('abog_supabase_api_url');
            if (!empty($supabaseOpt)) $this->api_base_url = $supabaseOpt;
        }

        // optional mapping overrides via constants or options
        if (defined('ABOG_KOMMO_PIPELINE_ID')) $this->kommo_pipeline_id = intval(ABOG_KOMMO_PIPELINE_ID);
        else {
            $pipelineOpt = get_option('abog_kommo_pipeline_id');
            if (!empty($pipelineOpt)) $this->kommo_pipeline_id = intval($pipelineOpt);
        }

        if (defined('ABOG_KOMMO_STATUS_ID')) $this->kommo_status_id = intval(ABOG_KOMMO_STATUS_ID);
        else {
            $statusOpt = get_option('abog_kommo_status_id');
            if (!empty($statusOpt)) $this->kommo_status_id = intval($statusOpt);
        }

        if (defined('ABOG_KOMMO_COURSE_FIELD_ID')) $this->kommo_course_field_id = intval(ABOG_KOMMO_COURSE_FIELD_ID);
        else {
            $courseFieldOpt = get_option('abog_kommo_course_field_id');
            if (!empty($courseFieldOpt)) $this->kommo_course_field_id = intval($courseFieldOpt);
        }

        if (defined('ABOG_KOMMO_CONTACT_EMAIL_FIELD_ID')) $this->kommo_contact_email_field_id = intval(ABOG_KOMMO_CONTACT_EMAIL_FIELD_ID);
        else {
            $emailFieldOpt = get_option('abog_kommo_contact_email_field_id');
            if (!empty($emailFieldOpt)) $this->kommo_contact_email_field_id = intval($emailFieldOpt);
        }

        if (defined('ABOG_KOMMO_CONTACT_PHONE_FIELD_ID')) $this->kommo_contact_phone_field_id = intval(ABOG_KOMMO_CONTACT_PHONE_FIELD_ID);
        else {
            $phoneFieldOpt = get_option('abog_kommo_contact_phone_field_id');
            if (!empty($phoneFieldOpt)) $this->kommo_contact_phone_field_id = intval($phoneFieldOpt);
        }
    }

    /**
     * Clear stored Kommo logs
     */
    public function handle_admin_clear_kommo_logs() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized', 403);
        }

        check_admin_referer('abog_clear_kommo_logs_nonce');
        update_option('abog_kommo_test_logs', array());
        wp_redirect(admin_url('options-general.php?page=abog-integration'));
        exit;
    }

    /**
     * Send a payload to Kommo using configured token
     * Returns WP HTTP response or WP_Error
     */
    public function send_to_kommo_payload($kommoData) {
        if (empty($this->kommo_token)) {
            return new WP_Error('no_token', 'Kommo API token not configured');
        }
        $args = array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->kommo_token,
                'Content-Type' => 'application/json'
            ),
            'body' => wp_json_encode($kommoData),
            'timeout' => 20
        );
        $url = rtrim($this->kommo_base_url, '/') . '/leads/complex';
        $response = wp_remote_post($url, $args);
        return $response;
    }

    /**
     * Append an entry to Kommo test logs
     */
    public function add_kommo_log($status, $message, $body = '') {
        $logs = get_option('abog_kommo_test_logs', array());
        $logs[] = array('time' => current_time('mysql'), 'status' => $status, 'message' => $message, 'body' => $body);
        // Keep only latest 20
        if (count($logs) > 20) {
            $logs = array_slice($logs, -20);
        }
        update_option('abog_kommo_test_logs', $logs);
    }
    
    public function enqueue_assets() {
        $plugin_url = plugin_dir_url(__FILE__);
        $version = '3.0.9';
        
        // Swiper CSS
        wp_enqueue_style(
            'swiper-css',
            'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
            array(),
            '11.0.0'
        );
        
        // Enqueue separated plugin styles
        wp_enqueue_style('abog-base', $plugin_url . 'assets/css/base.css', array(), $version);
        wp_enqueue_style('abog-courses', $plugin_url . 'assets/css/courses.css', array('abog-base'), $version);
        wp_enqueue_style('abog-upcoming', $plugin_url . 'assets/css/upcoming.css', array('abog-base'), $version);
        wp_enqueue_style('abog-teachers', $plugin_url . 'assets/css/teachers.css', array('abog-base', 'swiper-css'), $version);
        wp_enqueue_style('abog-patients', $plugin_url . 'assets/css/patients.css', array('abog-base'), $version);
        wp_enqueue_style('abog-classifieds', $plugin_url . 'assets/css/classifieds.css', array('abog-base'), $version);
        
        // Swiper JS
        wp_enqueue_script(
            'swiper-js',
            'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
            array(),
            '11.0.0',
            true
        );
        
        wp_enqueue_script(
            'abog-scripts',
            $plugin_url . 'assets/script.js',
            array('swiper-js'),
            $version,
            true
        );
        
        // Get painel URL from option or use default
        $painel_url = get_option('abog_painel_base_url', 'https://painel.abogoias.org.br');

        // Extract Supabase URL base (without /functions/v1) for storage uploads
        $supabase_base = '';
        if (!empty($this->api_base_url)) {
            $supabase_base = preg_replace('#/functions/v1$#', '', $this->api_base_url);
        }

        wp_localize_script('abog-scripts', 'ABOG_CONFIG', array(
            'apiCourses' => $this->api_base_url . '/wordpress-courses',
            'apiTeachers' => $this->api_base_url . '/public-teachers',
            'apiClassifieds' => $this->api_base_url . '/public-classifieds',
            'apiCreateClassified' => $this->api_base_url . '/create-public-classified',
            'apiCreatePatientLead' => $this->api_base_url . '/create-patient-lead',
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'proxyApiCourses' => admin_url('admin-ajax.php?action=abog_proxy&target=courses'),
            'proxyApiTeachers' => admin_url('admin-ajax.php?action=abog_proxy&target=teachers'),
            'proxyApiClassifieds' => admin_url('admin-ajax.php?action=abog_proxy&target=classifieds'),
            'createClassifiedUrl' => admin_url('admin-ajax.php?action=abog_create_classified'),
            'createPatientLeadUrl' => admin_url('admin-ajax.php?action=abog_create_patient_lead'),
            'kommoLeadUrl' => admin_url('admin-ajax.php?action=abog_send_kommo_lead'),
            'painelBaseUrl' => $painel_url,
            'supabaseUrl' => $supabase_base,
            'supabaseAnonKey' => defined('ABOG_SUPABASE_ANON_KEY') ? ABOG_SUPABASE_ANON_KEY : get_option('abog_supabase_anon_key', '')
        ));
    }

    /**
     * Generic proxy to fetch remote ABOG API endpoints to avoid CORS issues
     */
    public function ajax_proxy() {
        $target = isset($_GET['target']) ? sanitize_text_field($_GET['target']) : '';
        $allowed = array(
            'courses' => $this->api_base_url . '/wordpress-courses',
            'teachers' => $this->api_base_url . '/public-teachers',
            'classifieds' => $this->api_base_url . '/public-classifieds'
        );

        if (!isset($allowed[$target])) {
            wp_send_json_error(array('error' => 'Invalid target'), 400);
        }

        $url = $allowed[$target];
        // Forward any querystring params
        $queryParams = $_SERVER['QUERY_STRING'] ?? '';
        // Remove 'action=abog_proxy' and target param to avoid duplicates
        parse_str($queryParams, $qs);
        unset($qs['action']);
        unset($qs['target']);
        if (!empty($qs)) {
            $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($qs);
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $args = array('timeout' => 20);
        if (strtoupper($method) === 'POST') {
            // Forward POST body (JSON or form-data)
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (stripos($contentType, 'application/json') !== false) {
                $body = file_get_contents('php://input');
                $args['headers'] = array('Content-Type' => 'application/json');
                $args['body'] = $body;
            } else {
                // Allows form data via POST
                $args['body'] = $_POST;
            }
            $response = wp_remote_post($url, $args);
        } else {
            $response = wp_remote_get($url, $args);
        }
        if (is_wp_error($response)) {
            wp_send_json_error(array('error' => $response->get_error_message()), 500);
        }

        $body = wp_remote_retrieve_body($response);
        $code = wp_remote_retrieve_response_code($response);
        header('Content-Type: application/json');
        http_response_code($code);
        echo $body;
        exit;
    }

    /**
     * Handles AJAX request to send a lead directly to Kommo (overriding Supabase logic).
     */
    public function ajax_send_kommo_lead() {
        if (!isset($_POST['data'])) {
            wp_send_json_error(array('error' => 'No data received'), 400);
        }
        
        $data = json_decode(stripslashes($_POST['data']), true);

        if (empty($data['name']) || empty($data['email']) || empty($data['course_title'])) {
            wp_send_json_error(array('error' => 'Missing required fields (name, email, course_title)'), 400);
        }

        $course_title = sanitize_text_field($data['course_title']);
        $name = sanitize_text_field($data['name']);
        $email = sanitize_email($data['email']);
        $phone = isset($data['phone']) ? sanitize_text_field($data['phone']) : '';
        $cpf = isset($data['cpf']) ? sanitize_text_field($data['cpf']) : '';
        $notes = isset($data['notes']) ? sanitize_textarea_field($data['notes']) : '';

        // Monta o payload Kommo
        $payload = array(
            array(
                'name' => 'Lead Web: ' . $course_title,
                'price' => 0,
                'pipeline_id' => $this->kommo_pipeline_id,
                'status_id' => $this->kommo_status_id,
                'custom_fields_values' => array(
                    // Campo do Curso
                    array('field_id' => $this->kommo_course_field_id, 'values' => array(array('value' => $course_title))),
                ),
                '_embedded' => array(
                    'tags' => array(array('name' => 'FORMULÁRIO SITE')),
                    'contacts' => array(array(
                        'name' => $name,
                        'custom_fields_values' => array(
                            // Campo Email
                            array('field_id' => $this->kommo_contact_email_field_id, 'values' => array(array('value' => $email, 'enum_code' => 'WORK'))),
                        ),
                    ))
                )
            )
        );
        
        // Adiciona Telefone se existir
        if (!empty($phone)) {
            $phone_field = array('field_id' => $this->kommo_contact_phone_field_id, 'values' => array(array('value' => $phone, 'enum_code' => 'WORK')));
            $payload[0]['_embedded']['contacts'][0]['custom_fields_values'][] = $phone_field;
        }

        // Adiciona anotações como Nota/Task
        if (!empty($notes) || !empty($cpf)) {
            $notes_text = "Observações do Lead:\n";
            if (!empty($cpf)) $notes_text .= "CPF: {$cpf}\n";
            if (!empty($notes)) $notes_text .= "Notas: {$notes}";

            $payload[0]['_embedded']['notes'][] = array(
                'note_type' => 'common',
                'text' => $notes_text
            );
        }

        // Envia para o Kommo
        $result = $this->send_to_kommo_payload($payload);

        if (is_wp_error($result)) {
            error_log("ABOG Kommo Send Error: " . $result->get_error_message());
            wp_send_json_error(array('error' => 'Falha ao comunicar com Kommo: ' . $result->get_error_message()), 500);
        }

        $status = wp_remote_retrieve_response_code($result);
        $body = wp_remote_retrieve_body($result);

        if ($status >= 200 && $status < 300) {
            wp_send_json_success(array('message' => 'Lead enviado com sucesso para o Kommo!', 'kommo_status' => $status));
        } else {
            error_log("ABOG Kommo Send Failed - Status: {$status}, Body: {$body}");
            // Tenta extrair a mensagem de erro da API Kommo
            $error_message = json_decode($body, true)['_embedded']['errors'][0]['detail'] ?? "Erro HTTP {$status} ao enviar lead.";
            wp_send_json_error(array('error' => $error_message), 500);
        }
    }

    /**
     * Register admin menu
     */
    public function register_admin_menu() {
        add_options_page(
            'ABOG Integration',
            'ABOG Integration',
            'manage_options',
            'abog-integration',
            array($this, 'render_admin_page')
        );
    }

    /**
     * Handle admin test Kommo (admin_post handler)
     */
    public function handle_admin_test_kommo() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized', 403);
        }

        check_admin_referer('abog_test_kommo_nonce');

        // Build a small test payload
        $time = current_time('mysql');
        $name = 'ABOG Test - ' . $time;
        $admin_email = get_option('admin_email');
        $payload = array(
            array(
                'name' => $name,
                'price' => 0,
                'pipeline_id' => $this->kommo_pipeline_id,
                'status_id' => $this->kommo_status_id,
                'custom_fields_values' => array(
                    array('field_id' => $this->kommo_course_field_id, 'values' => array(array('value' => 'Teste via plugin')))
                ),
                '_embedded' => array(
                    'tags' => array(array('name' => 'PLUGIN TEST')),
                    'contacts' => array(array(
                        'name' => $name,
                        'custom_fields_values' => array(
                            array('field_id' => $this->kommo_contact_email_field_id, 'values' => array(array('value' => $admin_email, 'enum_code' => 'WORK')))
                        )
                    ))
                )
            )
        );

        // Send to Kommo
        $result = $this->send_to_kommo_payload($payload);
        if (is_wp_error($result)) {
            $this->add_kommo_log('error', $result->get_error_message(), '');
            $redirect = add_query_arg('abog_kommo_test', 'error', admin_url('options-general.php?page=abog-integration'));
        } else {
            $status = wp_remote_retrieve_response_code($result);
            $body = wp_remote_retrieve_body($result);
            if ($status >= 200 && $status < 300) {
                $this->add_kommo_log('success', 'OK', $body);
                $redirect = add_query_arg('abog_kommo_test', 'success', admin_url('options-general.php?page=abog-integration'));
            } else {
                $this->add_kommo_log('error', 'HTTP ' . $status, $body);
                $redirect = add_query_arg('abog_kommo_test', 'error', admin_url('options-general.php?page=abog-integration'));
            }
        }

        wp_redirect($redirect);
        exit;
    }

    /**
     * Register settings and settings fields
     */
    public function register_settings() {
        // Register settings - General
        register_setting('abog_integration_settings', 'abog_painel_base_url', array('sanitize_callback' => 'esc_url_raw'));
        register_setting('abog_integration_settings', 'abog_supabase_api_url', array('sanitize_callback' => 'esc_url_raw'));
        register_setting('abog_integration_settings', 'abog_supabase_anon_key', array('sanitize_callback' => 'sanitize_text_field'));

        // Register settings - Kommo
        register_setting('abog_integration_settings', 'abog_kommo_bearer_token', array('sanitize_callback' => 'sanitize_text_field'));
        register_setting('abog_integration_settings', 'abog_kommo_pipeline_id', array('sanitize_callback' => 'absint'));
        register_setting('abog_integration_settings', 'abog_kommo_status_id', array('sanitize_callback' => 'absint'));
        register_setting('abog_integration_settings', 'abog_kommo_course_field_id', array('sanitize_callback' => 'absint'));
        register_setting('abog_integration_settings', 'abog_kommo_contact_email_field_id', array('sanitize_callback' => 'absint'));
        register_setting('abog_integration_settings', 'abog_kommo_contact_phone_field_id', array('sanitize_callback' => 'absint'));
        // sending via plugin removed - Supabase function handles Kommo forwarding

        // General Settings Section
        add_settings_section('abog_general_section', 'Configurações Gerais', function() {
            echo '<p>Configurações gerais do plugin ABOG.</p>';
        }, 'abog_integration_settings');

        // General Fields
        add_settings_field('abog_painel_base_url', 'URL do Painel', array($this, 'field_painel_base_url'), 'abog_integration_settings', 'abog_general_section');
        add_settings_field('abog_supabase_api_url', 'Supabase API URL', array($this, 'field_supabase_api_url'), 'abog_integration_settings', 'abog_general_section');
        add_settings_field('abog_supabase_anon_key', 'Supabase Anon Key', array($this, 'field_supabase_anon_key'), 'abog_integration_settings', 'abog_general_section');

        // Kommo Section
        add_settings_section('abog_kommo_section', 'Kommo CRM Integration', function() {
            echo '<p>Configure Kommo API credentials and mapping for lead forwarding.</p>';
        }, 'abog_integration_settings');

        // Kommo Fields
        add_settings_field('abog_kommo_bearer_token', 'Kommo Bearer Token', array($this, 'field_kommo_bearer_token'), 'abog_integration_settings', 'abog_kommo_section');
        add_settings_field('abog_kommo_pipeline_id', 'Kommo Pipeline ID', array($this, 'field_kommo_pipeline_id'), 'abog_integration_settings', 'abog_kommo_section');
        add_settings_field('abog_kommo_status_id', 'Kommo Status ID', array($this, 'field_kommo_status_id'), 'abog_integration_settings', 'abog_kommo_section');
        add_settings_field('abog_kommo_course_field_id', 'Kommo - Course Field ID', array($this, 'field_kommo_course_field_id'), 'abog_integration_settings', 'abog_kommo_section');
        add_settings_field('abog_kommo_contact_email_field_id', 'Kommo - Contact Email Field ID', array($this, 'field_kommo_contact_email_field_id'), 'abog_integration_settings', 'abog_kommo_section');
        add_settings_field('abog_kommo_contact_phone_field_id', 'Kommo - Contact Phone Field ID', array($this, 'field_kommo_contact_phone_field_id'), 'abog_integration_settings', 'abog_kommo_section');
        // Removed field 'Enviar leads direto via plugin' because plugin no longer forwards to Kommo
    }

    /**
     * Render admin page
     */
    public function render_admin_page() {
        if (!current_user_can('manage_options')) return;
        ?>
        <div class="wrap">
            <h1>ABOG Integration - Configurações</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('abog_integration_settings');
                do_settings_sections('abog_integration_settings');
                submit_button();
                ?>
            </form>
            <hr />
            <h2>Testar Kommo</h2>
            <?php if (isset($_GET['abog_kommo_test']) && $_GET['abog_kommo_test'] === 'success'): ?>
                <div class="notice notice-success is-dismissible"><p>Teste enviado com sucesso para o Kommo. Confira se o lead apareceu no Kommo.</p></div>
            <?php elseif (isset($_GET['abog_kommo_test']) && $_GET['abog_kommo_test'] === 'error'): ?>
                <div class="notice notice-error is-dismissible"><p>Falha no teste para Kommo. Verifique o log abaixo para mais detalhes.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('abog_test_kommo_nonce'); ?>
                <input type="hidden" name="action" value="abog_test_kommo" />
                <button class="button button-primary" type="submit">Testar Kommo</button>
            </form>

            <h3>Logs de Kommo</h3>
            <?php
            $logs = get_option('abog_kommo_test_logs', array());
            if (!empty($logs)): ?>
                <table class="widefat fixed" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Status</th>
                            <th>Mensagem</th>
                            <th>Resposta</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach (array_reverse($logs) as $entry): ?>
                        <tr>
                            <td><?php echo esc_html($entry['time']); ?></td>
                            <td><?php echo esc_html($entry['status']); ?></td>
                            <td><?php echo esc_html($entry['message']); ?></td>
                            <td><pre><?php echo esc_html($entry['body']); ?></pre></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-top:10px;">
                    <?php wp_nonce_field('abog_clear_kommo_logs_nonce'); ?>
                    <input type="hidden" name="action" value="abog_clear_kommo_logs" />
                    <button class="button" type="submit">Limpar logs</button>
                </form>
            <?php else: ?>
                <p>Sem logs recentes.</p>
            <?php endif; ?>
            <hr />
            <h2>Observações</h2>
            <p><strong>Atenção:</strong> O formulário de Pré-Matrícula agora envia leads diretamente para o Kommo via AJAX do WordPress (usando a mesma lógica do botão Testar Kommo).</p>
            <p>Você também pode configurar os valores via constantes no <code>wp-config.php</code>, como <code>ABOG_KOMMO_API_TOKEN</code>, <code>ABOG_KOMMO_PIPELINE_ID</code>, etc. Constantes têm prioridade sobre as opções do banco de dados.</p>
        </div>
        <?php
    }

    // Field renderers
    public function field_painel_base_url() {
        $v = esc_attr(get_option('abog_painel_base_url', 'https://painel.abogoias.org.br'));
        echo "<input type='url' name='abog_painel_base_url' value='$v' class='regular-text' placeholder='https://painel.abogoias.org.br' />";
        echo '<p class="description">URL base do painel de cursos. Os cards de cursos redirecionarão para esta URL + /curso/[slug].</p>';
    }

    public function field_supabase_api_url() {
        $v = esc_attr(get_option('abog_supabase_api_url', ''));
        echo "<input type='url' name='abog_supabase_api_url' value='$v' class='regular-text' placeholder='https://your-project.supabase.co/functions/v1' />";
        echo '<p class="description">URL base do Supabase Edge Functions (ex: https://your-project.supabase.co/functions/v1). Pode ser definido via constante ABOG_SUPABASE_API_URL no wp-config.php.</p>';
    }

    public function field_supabase_anon_key() {
        $v = esc_attr(get_option('abog_supabase_anon_key', ''));
        echo "<input type='text' name='abog_supabase_anon_key' value='$v' class='regular-text' />";
        echo '<p class="description">Chave anônima (anon key) do Supabase. Usada para uploads de imagens no frontend. Pode ser definido via constante ABOG_SUPABASE_ANON_KEY no wp-config.php.</p>';
    }

    public function field_kommo_bearer_token() {
        $v = esc_attr(get_option('abog_kommo_bearer_token', ''));
        echo "<input type='text' name='abog_kommo_bearer_token' value='$v' class='regular-text' />";
        echo '<p class="description">Bearer token para o Kommo API (recomendado definir via wp-config.php para segurança).</p>';
    }

    public function field_kommo_pipeline_id() {
        $v = esc_attr(get_option('abog_kommo_pipeline_id', $this->kommo_pipeline_id));
        echo "<input type='number' name='abog_kommo_pipeline_id' value='$v' class='small-text' />";
    }

    public function field_kommo_status_id() {
        $v = esc_attr(get_option('abog_kommo_status_id', $this->kommo_status_id));
        echo "<input type='number' name='abog_kommo_status_id' value='$v' class='small-text' />";
    }

    public function field_kommo_course_field_id() {
        $v = esc_attr(get_option('abog_kommo_course_field_id', $this->kommo_course_field_id));
        echo "<input type='number' name='abog_kommo_course_field_id' value='$v' class='small-text' />";
    }

    public function field_kommo_contact_email_field_id() {
        $v = esc_attr(get_option('abog_kommo_contact_email_field_id', $this->kommo_contact_email_field_id));
        echo "<input type='number' name='abog_kommo_contact_email_field_id' value='$v' class='small-text' />";
    }

    public function field_kommo_contact_phone_field_id() {
        $v = esc_attr(get_option('abog_kommo_contact_phone_field_id', $this->kommo_contact_phone_field_id));
        echo "<input type='number' name='abog_kommo_contact_phone_field_id' value='$v' class='small-text' />";
    }

    // Forwarding option removed: Kommo forwarding handled by Supabase function
    
    public function render_courses($atts) {
        ob_start();
        ?>
        <div id="abog-courses-container" class="abog-container">
            <div id="abog-courses-filters" class="abog-filters">
                <div class="abog-filter-group">
                    <label for="filter-area">Área</label>
                    <select id="filter-area" class="abog-filter-select">
                        <option value="">Todas as áreas</option>
                    </select>
                </div>
                <div class="abog-filter-group">
                    <label for="filter-modality">Modalidade</label>
                    <select id="filter-modality" class="abog-filter-select">
                        <option value="">Todas</option>
                    </select>
                </div>
                <div class="abog-filter-group">
                    <label for="filter-audience">Público-Alvo</label>
                    <select id="filter-audience" class="abog-filter-select">
                        <option value="">Todos</option>
                    </select>
                </div>
                <div class="abog-filter-group">
                    <label for="sort-by">Ordenar por</label>
                    <select id="sort-by" class="abog-filter-select">
                        <option value="start_date_asc">Data de Início (Próximos)</option>
                        <option value="start_date_desc">Data de Início (Distantes)</option>
                        <option value="investment_asc">Valor (Menor)</option>
                        <option value="investment_desc">Valor (Maior)</option>
                        <option value="area_asc">Área (A-Z)</option>
                        <option value="area_desc">Área (Z-A)</option>
                    </select>
                </div>
                <button type="button" id="abog-clear-filters" class="abog-btn-clear-filters" style="display:none;">
                    Limpar Filtros
                </button>
            </div>
            <div id="abog-courses-loading" class="abog-loading">
                <div class="abog-spinner"></div>
                <p>Carregando cursos...</p>
            </div>
            <div id="abog-courses-grid" class="abog-grid"></div>
        </div>
        
        <div id="abog-course-modal" class="abog-modal">
            <div class="abog-modal-overlay"></div>
            <div class="abog-modal-content">
                <button class="abog-modal-close" aria-label="Fechar">&times;</button>
                <div id="abog-modal-body"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function render_upcoming_courses($atts) {
        ob_start();
        ?>
        <div id="abog-upcoming-courses-container" class="abog-container">
            <div id="abog-upcoming-courses-loading" class="abog-loading">
                <div class="abog-spinner"></div>
                <p>Carregando próximos cursos...</p>
            </div>
            <ul id="abog-upcoming-courses-list" class="abog-upcoming-list"></ul>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function render_teachers($atts) {
        ob_start();
        ?>
        <div id="abog-teachers-container" class="abog-container">
            <div id="abog-teachers-loading" class="abog-loading">
                <div class="abog-spinner"></div>
                <p>Carregando professores...</p>
            </div>
            <div class="swiper abog-teachers-swiper">
                <div id="abog-teachers-wrapper" class="swiper-wrapper"></div>
                <div class="swiper-pagination"></div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-button-next"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function render_classifieds($atts) {
        ob_start();
        ?>
        <div id="abog-classifieds-container" class="abog-container">
            <div id="abog-classifieds-loading" class="abog-loading">
                <div class="abog-spinner"></div>
                <p>Carregando classificados...</p>
            </div>
            <div id="abog-classifieds-grid" class="abog-grid"></div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function render_classifieds_form($atts) {
        ob_start();
        ?>
        <div id="abog-classifieds-form-container" class="abog-container">
            <div class="abog-form-wrapper">
                <h2 class="abog-form-title">Anunciar no Classificados</h2>
                <p class="abog-form-description">Preencha o formulário abaixo para criar um anúncio. Após o envio, ele será revisado e publicado.</p>
                
                <div class="abog-form-notice">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>Todos os anúncios passam por aprovação antes de serem publicados.</span>
                </div>
                
                <form id="abog-classified-form" class="abog-classified-form">
                    <div class="abog-form-section">
                        <h3>Informações do Anúncio</h3>
                        
                        <div class="abog-form-row">
                            <label for="classified-title">Título do Anúncio *</label>
                            <input type="text" id="classified-title" name="title" required minlength="5" placeholder="Ex: Vaga para Dentista, Equipamento à venda..." />
                        </div>
                        
                        <div class="abog-form-row">
                            <label for="classified-category">Categoria *</label>
                            <select id="classified-category" name="category" required>
                                <option value="">Selecione...</option>
                                <option value="vaga">Vaga de Emprego</option>
                                <option value="produto">Produto / Equipamento</option>
                                <option value="servico">Serviço</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                        
                        <div class="abog-form-row">
                            <label for="classified-description">Descrição *</label>
                            <textarea id="classified-description" name="description" required minlength="20" rows="5" placeholder="Descreva detalhadamente o anúncio..."></textarea>
                            <span class="abog-form-hint">Mínimo de 20 caracteres</span>
                        </div>
                        
                        <div class="abog-form-row-group">
                            <div class="abog-form-row">
                                <label for="classified-price">Preço (opcional)</label>
                                <input type="number" id="classified-price" name="price" step="0.01" min="0" placeholder="0.00" />
                            </div>
                            
                            <div class="abog-form-row">
                                <label for="classified-location">Localização (opcional)</label>
                                <input type="text" id="classified-location" name="location" placeholder="Ex: São Paulo - SP" />
                            </div>
                        </div>
                    </div>
                    
                    <div class="abog-form-section">
                        <h3>Fotos do Anúncio (opcional)</h3>
                        <p class="abog-form-hint">Adicione até 3 fotos. Formatos aceitos: JPG, PNG, WEBP. Máximo 5MB por imagem.</p>
                        
                        <div class="abog-image-uploads">
                            <div class="abog-image-upload-item" data-index="1">
                                <label for="classified-photo-1" class="abog-image-upload-label">
                                    <div class="abog-image-upload-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                        <span>Foto 1</span>
                                    </div>
                                    <div class="abog-image-preview" id="preview-1" style="display:none;"></div>
                                </label>
                                <input type="file" id="classified-photo-1" name="photo_1" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                                <button type="button" class="abog-image-remove" data-index="1" style="display:none;">×</button>
                                <div class="abog-image-error" id="error-1" style="display:none;"></div>
                            </div>
                            
                            <div class="abog-image-upload-item" data-index="2">
                                <label for="classified-photo-2" class="abog-image-upload-label">
                                    <div class="abog-image-upload-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                        <span>Foto 2</span>
                                    </div>
                                    <div class="abog-image-preview" id="preview-2" style="display:none;"></div>
                                </label>
                                <input type="file" id="classified-photo-2" name="photo_2" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                                <button type="button" class="abog-image-remove" data-index="2" style="display:none;">×</button>
                                <div class="abog-image-error" id="error-2" style="display:none;"></div>
                            </div>
                            
                            <div class="abog-image-upload-item" data-index="3">
                                <label for="classified-photo-3" class="abog-image-upload-label">
                                    <div class="abog-image-upload-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                        <span>Foto 3</span>
                                    </div>
                                    <div class="abog-image-preview" id="preview-3" style="display:none;"></div>
                                </label>
                                <input type="file" id="classified-photo-3" name="photo_3" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                                <button type="button" class="abog-image-remove" data-index="3" style="display:none;">×</button>
                                <div class="abog-image-error" id="error-3" style="display:none;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="abog-form-section">
                        <h3>Informações de Contato</h3>
                        
                        <div class="abog-form-row">
                            <label for="classified-contact-name">Nome para Contato *</label>
                            <input type="text" id="classified-contact-name" name="contact_name" required minlength="3" placeholder="Seu nome ou nome da empresa" />
                        </div>
                        
                        <div class="abog-form-row-group">
                            <div class="abog-form-row">
                                <label for="classified-contact-email">E-mail *</label>
                                <input type="email" id="classified-contact-email" name="contact_email" required placeholder="contato@exemplo.com" />
                            </div>
                            
                            <div class="abog-form-row">
                                <label for="classified-contact-phone">Telefone (opcional)</label>
                                <input type="tel" id="classified-contact-phone" name="contact_phone" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="abog-btn-primary abog-btn-submit">
                        <span class="abog-btn-text">Enviar para Aprovação</span>
                        <span class="abog-btn-loading" style="display:none;">
                            <div class="abog-spinner-small"></div>
                            Enviando...
                        </span>
                    </button>
                    
                    <div class="abog-form-message" style="display:none;"></div>
                </form>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX handler for creating public classifieds
     */
    public function ajax_create_classified() {
        // Get JSON data from request body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data) {
            // Try $_POST as fallback
            $data = isset($_POST['data']) ? json_decode(stripslashes($_POST['data']), true) : null;
        }
        
        if (!$data) {
            wp_send_json_error(array('error' => 'Dados não recebidos'), 400);
        }
        
        // Forward to edge function
        $url = $this->api_base_url . '/create-public-classified';
        
        $response = wp_remote_post($url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => wp_json_encode($data),
            'timeout' => 20
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('error' => $response->get_error_message()), 500);
        }
        
        $body = wp_remote_retrieve_body($response);
        $status = wp_remote_retrieve_response_code($response);
        $result = json_decode($body, true);
        
        if ($status >= 200 && $status < 300 && isset($result['success']) && $result['success']) {
            wp_send_json_success($result);
        } else {
            $error = isset($result['error']) ? $result['error'] : 'Erro ao criar anúncio';
            wp_send_json_error(array('error' => $error), $status >= 400 ? $status : 400);
        }
    }

    /**
     * Render patient contact form
     */
    public function render_patient_form($atts) {
        $atts = shortcode_atts(array(
            'title' => 'Agende sua Consulta',
            'subtitle' => 'Preencha o formulário abaixo e entraremos em contato'
        ), $atts, 'abog_patient_form');
        
        ob_start();
        ?>
        <div class="abog-patient-form-container" id="abog-patient-form-container">
            <div class="abog-patient-form-header">
                <h2><?php echo esc_html($atts['title']); ?></h2>
                <p><?php echo esc_html($atts['subtitle']); ?></p>
            </div>
            
            <form class="abog-patient-form" id="abog-patient-form">
                <div class="abog-patient-form-error" id="patient-form-error" style="display:none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span id="patient-error-message"></span>
                </div>
                
                <div class="abog-patient-form-row full-width">
                    <div class="abog-patient-form-group">
                        <label for="patient-full-name">Nome Completo <span class="required">*</span></label>
                        <input type="text" id="patient-full-name" name="full_name" required minlength="2" placeholder="Digite seu nome completo" />
                    </div>
                </div>

                <div class="abog-patient-form-row">
                    <div class="abog-patient-form-group">
                        <label for="patient-cpf">CPF <span class="required">*</span></label>
                        <input type="text" id="patient-cpf" name="cpf" required maxlength="14" placeholder="000.000.000-00" />
                    </div>
                    <div class="abog-patient-form-group">
                        <label for="patient-mobile-phone">Celular <span class="required">*</span></label>
                        <input type="tel" id="patient-mobile-phone" name="mobile_phone" required placeholder="(00) 00000-0000" />
                    </div>
                </div>

                <div class="abog-patient-form-row">
                    <div class="abog-patient-form-group">
                        <label for="patient-landline-phone">Telefone Fixo</label>
                        <input type="tel" id="patient-landline-phone" name="landline_phone" placeholder="(00) 0000-0000" />
                    </div>
                </div>
                
                <div class="abog-patient-form-row">
                    <div class="abog-patient-form-group">
                        <label for="patient-gender">Sexo <span class="required">*</span></label>
                        <select id="patient-gender" name="gender" required>
                            <option value="">Selecione</option>
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>
                    <div class="abog-patient-form-group">
                        <label for="patient-birth-date">Data de Nascimento <span class="required">*</span></label>
                        <input type="date" id="patient-birth-date" name="birth_date" required />
                    </div>
                </div>
                
                <div class="abog-patient-form-row">
                    <div class="abog-patient-form-group">
                        <label for="patient-state">Estado (UF) <span class="required">*</span></label>
                        <select id="patient-state" name="state" required>
                            <option value="">Selecione o estado</option>
                            <option value="AC">Acre</option>
                            <option value="AL">Alagoas</option>
                            <option value="AP">Amapá</option>
                            <option value="AM">Amazonas</option>
                            <option value="BA">Bahia</option>
                            <option value="CE">Ceará</option>
                            <option value="DF">Distrito Federal</option>
                            <option value="ES">Espírito Santo</option>
                            <option value="GO">Goiás</option>
                            <option value="MA">Maranhão</option>
                            <option value="MT">Mato Grosso</option>
                            <option value="MS">Mato Grosso do Sul</option>
                            <option value="MG">Minas Gerais</option>
                            <option value="PA">Pará</option>
                            <option value="PB">Paraíba</option>
                            <option value="PR">Paraná</option>
                            <option value="PE">Pernambuco</option>
                            <option value="PI">Piauí</option>
                            <option value="RJ">Rio de Janeiro</option>
                            <option value="RN">Rio Grande do Norte</option>
                            <option value="RS">Rio Grande do Sul</option>
                            <option value="RO">Rondônia</option>
                            <option value="RR">Roraima</option>
                            <option value="SC">Santa Catarina</option>
                            <option value="SP">São Paulo</option>
                            <option value="SE">Sergipe</option>
                            <option value="TO">Tocantins</option>
                        </select>
                    </div>
                    <div class="abog-patient-form-group">
                        <label for="patient-city">Cidade <span class="required">*</span></label>
                        <input type="text" id="patient-city" name="city" required placeholder="Digite sua cidade" />
                    </div>
                </div>
                
                <div class="abog-patient-form-row full-width">
                    <div class="abog-patient-form-group">
                        <label for="patient-message">De que tratamento você precisa? <span class="required">*</span></label>
                        <textarea id="patient-message" name="message" required rows="4" placeholder="Descreva o tratamento ou procedimento que você está buscando..."></textarea>
                    </div>
                </div>
                
                <button type="submit" class="abog-patient-form-submit" id="patient-submit-btn">
                    Enviar Solicitação
                </button>
            </form>
            
            <div class="abog-patient-form-success" id="patient-form-success" style="display:none;">
                <div class="abog-patient-form-success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                </div>
                <h3>Solicitação Enviada!</h3>
                <p>Recebemos seus dados e entraremos em contato em breve para agendar sua consulta.</p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX handler for creating patient leads
     */
    public function ajax_create_patient_lead() {
        // Get JSON data from request body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data) {
            // Try $_POST as fallback
            $data = isset($_POST['data']) ? json_decode(stripslashes($_POST['data']), true) : null;
        }
        
        if (!$data) {
            wp_send_json_error(array('error' => 'Dados não recebidos'), 400);
        }
        
        // Forward to edge function
        $url = $this->api_base_url . '/create-patient-lead';
        
        $response = wp_remote_post($url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => wp_json_encode($data),
            'timeout' => 20
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('error' => $response->get_error_message()), 500);
        }
        
        $body = wp_remote_retrieve_body($response);
        $status = wp_remote_retrieve_response_code($response);
        $result = json_decode($body, true);
        
        if ($status >= 200 && $status < 300 && isset($result['success']) && $result['success']) {
            wp_send_json_success($result);
        } else {
            $error = isset($result['error']) ? $result['error'] : 'Erro ao enviar dados';
            wp_send_json_error(array('error' => $error), $status >= 400 ? $status : 400);
        }
    }
}

new ABOG_Integration();