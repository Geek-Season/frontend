# Анимация из символов на главной

Персонаж — свой, нарисован для Geek Season: девочка-гик в наушниках за ноутбуком, рядом кружка
и спящий кот. Рисунок — простые линии в SVG (`draw.py`), каждый кадр переводится в символы
(`to_ascii.py`), готовые кадры лежат в `src/assets/ascii-girl.json` и грузятся отдельным файлом.

Пересобрать (например, поменяв рисунок в `draw.py`):

```bash
mkdir -p /tmp/ascii && cd /tmp/ascii
python3 <репо>/scripts/ascii/draw.py            # frame00.svg … frame23.svg
node <репо>/scripts/ascii/render.cjs .          # → frameNN.png (нужен Playwright)
python3 <репо>/scripts/ascii/to_ascii.py        # → frames.json (нужен Pillow)
cp frames.json <репо>/src/assets/ascii-girl.json
```

`to_ascii.py`: картинка делится на 88×42 ячеек; в каждой — сколько белого и куда идёт линия.
Почти пусто — пробел или точка, линия — символ по направлению (`- / | \ _`), заливка — `#` и `@`.
