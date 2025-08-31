import antfu from "@antfu/eslint-config"

export default antfu(
  {
    react: true,
    lessOpinionated: true,
    markdown: false,
    stylistic: {
      quotes: "double",
    },
    rules: {
      "node/prefer-global/process": "off",
      "style/eol-last": "off",
      "react-hooks-extra/no-direct-set-state-in-use-effect": "off",
      "react/no-context-provider": "off",
      "react-dom/no-missing-button-type": "off",
      "antfu/curly": "error",
      "curly": "off",
      "style/brace-style": ["error", "1tbs"],
      "no-console": "off",
      "antfu/no-top-level-await": "off",
      "unused-imports/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "off",
      "no-control-regex": "off",
    },
  },
)
