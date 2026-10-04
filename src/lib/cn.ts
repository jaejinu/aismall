import { extendTailwindMerge } from "tailwind-merge";

/* 프로젝트 텍스트 스타일(text-h1 등)을 글자 크기 그룹으로 알려 줘서, text-fg 같은 색 클래스와 충돌하지 않게 한다. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body-lg", "body-md", "body-sm", "label-md", "label-sm", "caption"] },
      ],
    },
  },
});

export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
