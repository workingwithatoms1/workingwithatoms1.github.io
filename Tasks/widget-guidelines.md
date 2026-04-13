# Widget Design Guidelines

## Fixed axes, reshaping curves

When a widget has sliders that change parameters, the axes must stay fixed and the curve must reshape. Do not rescale the axes to fit the data.

The user should see the curve physically change shape as they drag a slider. If the axes rescale, the visual effect is lost — the curve looks the same but the numbers change, which teaches nothing.

Choose axis ranges that accommodate the full slider range. If the curve goes off-screen at extreme values, that is fine and informative (it shows the parameter has a dramatic effect).

## Clip curves to the plot area

Always add a clip rect before drawing curves and restore after:

```js
ctx.save();
ctx.beginPath();
ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
ctx.clip();

// ... draw curves ...

ctx.restore();
```

This prevents curves from overflowing into the axis label area when values exceed the axis range.

## Axis labels must not overlap tick marks

Use sufficient left padding (typically `pad.l: 56` to `72`) so that y-axis tick labels don't collide with the axis title. The axis title is drawn by `C.drawAxes` at a fixed position; if ticks have long labels (scientific notation, large numbers), increase padding.

## Conventions

- Use `import * as C from './chart-utils.js'`
- Use `C.createWidgetShell(container, 0.55)` (aspect ratio 0.55 unless the widget needs different)
- Background: `#e1e0e8` (set by `createWidgetShell`)
- Fonts: DM Sans via `C.LABEL_FONT`, `C.TICK_FONT`, `C.TITLE_FONT`, `C.VALUE_FONT`
- Colours: `C.BLUE` (#2a2f7c), `C.LIGHT` (#4d5cf2), `C.RED` (#8b2252), `C.MUTED` (#888)
- Slider accent colour: `#2a2f7c`
- Export: `export function create(container, config) { ... }`
- Register in `scripts/widgets/index.js`
- Resize: `window.addEventListener('resize', render)`

## Physics first

The model behind each widget must be physically correct. If the model is a simplification, say so in a comment. Do not invent plausible-looking curves without a real equation behind them.

If the physics cannot be expressed as a simple closed-form equation, do not build the widget. A wrong interactive diagram is worse than no diagram.
