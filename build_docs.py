import os

def build():
    with open('Index.html', 'r', encoding='utf-8') as f:
        idx = f.read()
    with open('Styles.html', 'r', encoding='utf-8') as f:
        styles = f.read().strip()
    with open('Scripts.html', 'r', encoding='utf-8') as f:
        scripts = f.read().strip()

    # Styles.html already has <style>...</style>
    # Scripts.html already has <script>...</script>
    out = idx.replace("<?!= include('Styles'); ?>", styles)
    out = out.replace("<?!= include('Scripts'); ?>", scripts)

    os.makedirs('docs', exist_ok=True)
    with open('docs/index.html', 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'Successfully built docs/index.html ({len(out)} bytes, {out.count(chr(10))} lines)')

if __name__ == '__main__':
    build()
