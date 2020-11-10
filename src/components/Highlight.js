// @flow

import React, { Component, type Node } from "react";
import normalizeTokens from "../utils/normalizeTokens";
import themeToDict, { type ThemeDict } from "../utils/themeToDict";

import type {
  Language,
  Token,
  LineInputProps,
  LineOutputProps,
  TokenInputProps,
  TokenOutputProps,
  RenderProps,
  PrismLib,
  PrismTheme,
} from "../types";

type Props = {
  Prism: any,
  theme?: PrismTheme,
  language: Language,
  code: string,
  children: (props: RenderProps) => Node,
};

class Highlight extends Component<Props, *> {
  prevTheme: PrismTheme | void;
  prevLanguage: Language | void;
  themeDict: ThemeDict | void;

  getThemeDict = (props: Props) => {
    if (
      this.themeDict !== undefined &&
      props.theme === this.prevTheme &&
      props.language === this.prevLanguage
    ) {
      return this.themeDict;
    }

    this.prevTheme = props.theme;
    this.prevLanguage = props.language;

    const themeDict = props.theme
      ? themeToDict(props.theme, props.language)
      : undefined;
    return (this.themeDict = themeDict);
  };

  getLineProps = ({
    key,
    className,
    style,
    line,
    ...rest
  }: LineInputProps): LineOutputProps => {
    const output: LineOutputProps = {
      ...rest,
      className: "token-line",
      style: undefined,
      key: undefined,
    };

    const themeDict = this.getThemeDict(this.props);
    if (themeDict !== undefined) {
      output.style = themeDict.plain;
    }

    if (style !== undefined) {
      output.style =
        output.style !== undefined ? { ...output.style, ...style } : style;
    }

    if (key !== undefined) output.key = key;
    if (className) output.className += ` ${className}`;

    return output;
  };

  getStyleForToken = ({ types, empty }: Token) => {
    const typesSize = types.length;
    const themeDict = this.getThemeDict(this.props);

    if (themeDict === undefined) {
      return undefined;
    } else if (typesSize === 1 && types[0] === "plain") {
      return empty ? { display: "inline-block" } : undefined;
    } else if (typesSize === 1 && !empty) {
      return themeDict[types[0]];
    }

    const baseStyle = empty ? { display: "inline-block" } : {};
    // $FlowFixMe
    const typeStyles = types.map((type) => themeDict[type]);
    return Object.assign(baseStyle, ...typeStyles);
  };

  getTokenProps = ({
    key,
    className,
    style,
    token,
    ...rest
  }: TokenInputProps): TokenOutputProps => {
    const output: TokenOutputProps = {
      ...rest,
      className: `token ${token.types.join(" ")}`,
      children: token.content,
      style: this.getStyleForToken(token),
      key: undefined,
    };

    if (style !== undefined) {
      output.style =
        output.style !== undefined ? { ...output.style, ...style } : style;
    }

    if (key !== undefined) output.key = key;
    if (className) output.className += ` ${className}`;

    return output;
  };

  render() {
    const { Prism, language, code, children } = this.props;

    const themeDict = this.getThemeDict(this.props);

    const grammar = Prism.languages[language];

    // JOSH TWEAK
    //
    // Normally, Prism works by calling a "highlight" method. That
    // method does the tokenization, and also runs hooks.
    // The `js-templates` language I want to use relies on these
    // hooks, but `prism-react-renderer` doesn't call them; in
    // fact, in PRR's build of Prismjs, it stripped out the idea
    // of hooks altogether!
    //
    // I'm bringing my own version of Prismjs, and that version
    // supports hooks, but because we aren't calling `highlight`,
    // those hooks are never called.
    //
    // I'm calling them myself, to add that augmented functionality.
    let mixedTokens = [code];
    if (grammar !== undefined) {
      var env: any = {
        code,
        grammar,
        language,
      };

      Prism.hooks.run("before-tokenize", env);
      let tokens = Prism.tokenize(env.code, env.grammar);
      env.tokens = tokens;
      Prism.hooks.run("after-tokenize", env);
      mixedTokens = tokens;
    }

    const tokens = normalizeTokens(mixedTokens);

    return children({
      tokens,
      className: `prism-code language-${language}`,
      style: themeDict !== undefined ? themeDict.root : {},
      getLineProps: this.getLineProps,
      getTokenProps: this.getTokenProps,
    });
  }
}

export default Highlight;
