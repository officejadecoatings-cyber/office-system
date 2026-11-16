import os
import re

def build():
    with open('Index.html', 'r', encoding='utf-8') as f:
        idx = f.read()
    with open('Styles.html', 'r', encoding='utf-8') as f:
        styles = f.read().strip()
    with open('Scripts.html', 'r', encoding='utf-8') as f:
        scripts = f.read().strip()

    # In Index.html:
    # <?!= include('Styles'); ?> -> <style>\n{styles}\n</style>
    # <?!= include('Scripts'); ?> -> <script>\n{scripts}\n</script>

    style_block = f'<style>\n{styles}\n</style>'
    script_block = f'<script>\n{scripts}\n</script>'

    out = idx.replace("<?!= include('Styles'); ?>", style_block)
    out = out.replace("<?!= include('Scripts'); ?>", script_block)

    os.makedirs('docs', exist_ok=True)
    with open('docs/index.html', 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'Successfully built docs/index.html ({len(out)} bytes, {out.count(chr(10))} lines)')

if __name__ == '__main__':
    build()
