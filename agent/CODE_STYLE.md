# Code style

This document describes the preferred code style for RNIS. Its goal is to keep components visually consistent, easy to scan, and easy to modify later.

## Core principles

1. Prefer readable code over clever code.
2. Use Tailwind CSS for normal layout, spacing, sizing, typography, and colors.
3. Use scoped CSS when Tailwind state or selector combinations become difficult to understand.
4. Use the existing design tokens and spacing scale instead of introducing similar custom values.
5. Keep component data, markup, behavior, and styles clearly separated.
6. Preserve semantic HTML and keyboard accessibility when adding interactions.

## Formatting

The project formatting configuration is the source of truth:

- Use four spaces for indentation.
- Use double quotes.
- Use semicolons.
- Include trailing commas where supported by ES5 syntax.
- Put one Astro or JSX attribute on each line when an element has multiple attributes.
- Keep the closing bracket on a separate line for multiline elements.
- Use LF line endings and include a final newline.

```astro
<button
    class="border border-dragon-border p-3"
    type="button"
    aria-selected="false"
>
    Select field
</button>
```

## Astro component structure

Organize an Astro component in this order:

1. Imports
2. Type definitions
3. Props and derived data
4. Markup
5. Client script, when needed
6. Scoped styles, when needed

```astro
---
import SketchBox from "@/components/Sketch/Box.astro";

interface Props {
    title: string;
    items: string[];
}

const { title, items } = Astro.props;
---

<section>
    <h2>{title}</h2>
    {items.map((item) => <p>{item}</p>)}
</section>

<script>
    // Client behavior
</script>

<style>
    /* Styles that are clearer in CSS */
</style>
```

Do not mix unrelated calculations into the markup. Create a small, named helper when a value needs explanation or is used more than once.

```ts
const formatNumber = (index: number) => String(index + 1).padStart(2, "0");
```

## TypeScript

- Type component props explicitly.
- Extract a named interface when a nested data structure has meaning of its own.
- Use `type` for unions and simple aliases.
- Use `interface` for object-shaped Astro props and domain objects.
- Prefer inferred local types when the value already makes the type obvious.
- Avoid `any`.
- Use optional chaining when a related DOM element may legitimately be absent.
- Use early returns to keep control flow shallow.

```ts
interface LearningArea {
    name: string;
    tags: string[];
    lead: string;
    body: string;
}

interface Props {
    areas: LearningArea[];
}
```

## Naming

- Components and component files use `PascalCase`.
- Variables and functions use `camelCase`.
- Types and interfaces use `PascalCase`.
- Data attributes use descriptive kebab-case names.
- CSS classes use descriptive kebab-case names when they represent behavior or a reusable visual treatment.
- Boolean names should read as conditions, such as `isSelected`, `hasImage`, or `prefersReducedMotion`.

```html
<section data-learning>
    <button class="learning-tab" data-learning-tab></button>
</section>
```

Names should describe responsibility instead of implementation. Prefer `selectTab` over `changeClasses`, and `field-grid` over `blue-background`.

## Tailwind CSS

Use Tailwind for straightforward styling that can be understood by reading the utilities once.

Good Tailwind use includes:

- Flexbox and grid layout
- Width and height
- Margin, padding, and gap
- Borders and backgrounds
- Typography and colors
- Simple responsive layout changes
- A single, obvious hover or focus state

```astro
<div class="grid grid-cols-[2fr_3fr] items-stretch gap-4 max-tablet:grid-cols-1">
    <!-- content -->
</div>
```

Prefer project theme utilities such as:

- `text-dragon-ink`
- `text-dragon-muted`
- `border-dragon-border`
- `bg-dragon-card`
- `font-archivo`
- `font-jetbrains-mono`
- `font-dragon-hand`

Do not repeat raw color values when a Dragon theme token already exists.

### Class readability

Keep normal Tailwind utilities directly on the element. Do not move ordinary utilities into constants only to shorten the markup.

Use `class:list` when classes are genuinely conditional.

```astro
<a
    class:list={[
        "px-3 py-2 text-sm text-dragon-ink",
        isActive && "font-bold text-dragon-accent",
    ]}
>
    Link
</a>
```

Do not build long Tailwind expressions for combined state, attribute, pseudo-element, and responsive behavior.

Avoid:

```html
<button class="max-tablet:aria-selected:-translate-y-0.5 max-tablet:focus-visible:translate-x-0">
```

Prefer:

```astro
<button class="learning-tab border border-dragon-border p-3">
```

```css
.learning-tab[aria-selected="true"] {
    border-color: var(--cobalt);
    background: var(--acc-bg);
    transform: translateX(8px);
}

@media (max-width: 860px) {
    .learning-tab[aria-selected="true"] {
        transform: translateY(-2px);
    }
}
```

## When to use scoped CSS

Create a raw CSS class when at least one of these is true:

- A selector uses `::before` or `::after`.
- A selector depends on an ARIA or data attribute.
- Several hover, focus, selected, and responsive variants must work together.
- The same long state expression would appear more than once.
- The style uses multiple layered gradients.
- The visual rule is easier to understand as one named concept.
- Tailwind utilities obscure the behavior they are implementing.

Keep scoped CSS close to the component that owns the behavior. Put a style in `global.css` only when multiple unrelated components need it or when it defines a global token, base rule, or animation.

## Values and spacing

Prefer standard Tailwind values:

```html
<div class="gap-4 p-6 text-sm">
```

Avoid arbitrary layout values when a nearby standard value is available:

```html
<!-- Avoid -->
<div class="gap-[18px] p-[34px] min-h-[440px]">

<!-- Prefer -->
<div class="gap-4 p-8 min-h-96">
```

For raw CSS, use simple values from the same spacing rhythm whenever possible:

- `2px`
- `4px`
- `8px`
- `16px`
- `24px`
- `32px`
- `2rem`

Avoid values such as `13.75rem`, `1.125rem`, or `34px` for normal layout. They are difficult to remember and can make neighboring sections look inconsistent.

Arbitrary values are acceptable when they express a real layout relationship that Tailwind does not provide clearly, such as `grid-cols-[2fr_3fr]`. Keep these values simple and intentional.

Small irregular values may also be used for the hand-drawn visual language, such as card rotations or sketch borders. Keep those decorative values isolated from structural spacing so they cannot change the layout unexpectedly.

## Responsive design

- Build the desktop and mobile behavior as part of the same component.
- Use the project `tablet` breakpoint for normal Tailwind layout changes.
- Prefer simple responsive utilities such as `max-tablet:grid-cols-1`.
- Move responsive state combinations into scoped CSS.
- Allow content to grow naturally on small screens instead of forcing it into a viewport height.
- Avoid fixed minimum heights unless the design explicitly requires them.
- Check that responsive changes do not introduce horizontal page overflow.

```astro
<div class="grid grid-cols-3 gap-4 max-tablet:grid-cols-1">
```

## Client-side behavior

- Scope DOM queries to the component root.
- Mark component roots and interactive elements with descriptive data attributes.
- Separate initialization, state updates, and event binding into small functions.
- Store repeated key names or options in a named array.
- Do not use visual CSS classes as the only source of interaction state.
- Keep ARIA state synchronized with visible state.

```ts
const initializeTabs = (section: HTMLElement) => {
    const tabs = Array.from(
        section.querySelectorAll<HTMLButtonElement>("[data-tab]")
    );

    const selectTab = (selectedIndex: number) => {
        tabs.forEach((tab, index) => {
            tab.setAttribute(
                "aria-selected",
                String(index === selectedIndex)
            );
        });
    };
};
```

Use JavaScript for behavior and CSS for presentation. JavaScript should update semantic state such as `aria-selected`, `hidden`, or a concise state class. CSS should decide how that state looks.

## Accessibility

- Use the native element that matches the action: links navigate, buttons perform actions.
- Give icon-only buttons an accessible label.
- Connect tabs and panels with `aria-controls` and `aria-labelledby`.
- Keep only the selected tab in the normal tab order.
- Support keyboard navigation for custom widgets.
- Use `hidden` for inactive content when it should not be exposed to assistive technology.
- Respect `prefers-reduced-motion` for substantial animation.
- Keep visible focus styles unless the component provides a clear replacement.

## Component boundaries

Create a component when a piece of UI:

- Is reused in more than one place
- Has its own clear responsibility
- Owns a meaningful interaction
- Has enough markup to distract from the parent component

Do not create a component for a single wrapper with no behavior or meaning. Prefer existing shared primitives such as `SketchBox`, `SketchBorder`, and `SketchTag` instead of rebuilding their visual treatment.

## Comments

Comments should explain intent, constraints, or surprising behavior. Do not narrate code that is already obvious.

Good:

```ts
// Ignore unavailable storage; the in-page theme still updates.
```

Avoid:

```ts
// Set the selected tab.
selectTab(index);
```

## Review checklist

Before considering a component complete, check the following:

- Are props and domain data typed?
- Are names descriptive and consistent?
- Are normal styles expressed with Tailwind?
- Were complex selector and state combinations moved to scoped CSS?
- Are standard spacing and sizing values used?
- Are arbitrary values simple, necessary, and intentional?
- Are theme tokens used instead of raw colors?
- Does the component stack cleanly at the tablet breakpoint?
- Is interaction state represented semantically?
- Can the interaction be used with a keyboard?
- Is the code divided clearly into data, markup, behavior, and styles?
- Does formatting match `.editorconfig` and `.prettierrc`?
