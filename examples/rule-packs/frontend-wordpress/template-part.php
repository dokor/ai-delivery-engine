<?php
// wordpress/escaping — always escape output and sanitize input.
// Never edit WordPress core; extend via hooks (wordpress/hooks).

$title = get_the_title();
$link  = get_permalink();
?>
<article>
  <h2><?php echo esc_html( $title ); ?></h2>
  <a href="<?php echo esc_url( $link ); ?>"><?php esc_html_e( 'Read more', 'my-theme' ); ?></a>
</article>
