const CracoLessPlugin = require("./craco-less");
const { overrideWebpack } = require("@craco/craco/lib/features/webpack");
const {
  applyCracoConfigPlugins
} = require("@craco/craco/lib/features/plugins");

const clone = require("clone");

const { craPaths, loadWebpackDevConfig } = require("@craco/craco/lib/cra");

const context = { env: "development", paths: craPaths };

let webpackConfig;
let originalWebpackConfig;
beforeEach(() => {
  if (!originalWebpackConfig) {
    process.env.NODE_ENV = "development";
    originalWebpackConfig = loadWebpackDevConfig();
    process.env.NODE_ENV = "test";
  }

  // loadWebpackDevConfig() caches the config internally, so we need to
  // deep clone the object before each test.
  webpackConfig = clone(originalWebpackConfig);
});

const applyCracoConfigAndOverrideWebpack = cracoConfig => {
  cracoConfig = applyCracoConfigPlugins(cracoConfig, context);
  overrideWebpack(cracoConfig, webpackConfig, () => {}, context);
};

test("the webpack config is modified correctly without any options", () => {
  applyCracoConfigAndOverrideWebpack({
    plugins: [{ plugin: CracoLessPlugin }]
  });
  const oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  expect(oneOfRule).not.toBeUndefined();
  const lessRule = oneOfRule.oneOf.find(
    r => r.test && r.test.toString() === "/\\.less$/"
  );
  expect(lessRule).not.toBeUndefined();

  expect(lessRule.use[2].loader).toContain("/postcss-loader");
  expect(lessRule.use[2].options.ident).toEqual("postcss");
  expect(lessRule.use[2].options.plugins).not.toBeUndefined();

  expect(lessRule.use[3].loader).toContain("/less-loader");
  expect(lessRule.use[3].options).toEqual({});
});

test("the webpack config is modified correctly with less-loader options", () => {
  applyCracoConfigAndOverrideWebpack({
    plugins: [
      {
        plugin: CracoLessPlugin,
        options: {
          lessLoaderOptions: {
            modifyVars: {
              "@less-variable": "#fff"
            },
            javascriptEnabled: true
          }
        }
      }
    ]
  });

  const oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  expect(oneOfRule).not.toBeUndefined();
  const lessRule = oneOfRule.oneOf.find(
    r => r.test && r.test.toString() === "/\\.less$/"
  );
  expect(lessRule).not.toBeUndefined();

  expect(lessRule.use[2].loader).toContain("/postcss-loader");
  expect(lessRule.use[2].options.ident).toEqual("postcss");
  expect(lessRule.use[2].options.plugins).not.toBeUndefined();

  expect(lessRule.use[3].loader).toContain("/less-loader");
  expect(lessRule.use[3].options).toEqual({
    javascriptEnabled: true,
    modifyVars: {
      "@less-variable": "#fff"
    }
  });
});

test("the webpack config is modified correctly with all loader options", () => {
  applyCracoConfigAndOverrideWebpack({
    plugins: [
      {
        plugin: CracoLessPlugin,
        options: {
          lessLoaderOptions: {
            modifyVars: {
              "@less-variable": "#fff"
            },
            javascriptEnabled: true
          },
          cssLoaderOptions: {
            modules: true,
            localIdentName: "[local]_[hash:base64:5]"
          },
          postcssLoaderOptions: {
            ident: "test-ident"
          },
          styleLoaderOptions: {
            sourceMaps: true
          },
          miniCssExtractPluginOptions: {
            testOption: "test-value"
          }
        }
      }
    ]
  });

  const oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  expect(oneOfRule).not.toBeUndefined();
  const lessRule = oneOfRule.oneOf.find(
    r => r.test && r.test.toString() === "/\\.less$/"
  );
  expect(lessRule).not.toBeUndefined();
  expect(lessRule.use[0].loader).toContain("/style-loader");
  expect(lessRule.use[0].options).toEqual({
    sourceMaps: true
  });

  expect(lessRule.use[1].loader).toContain("/css-loader");
  expect(lessRule.use[1].options).toEqual({
    modules: true,
    importLoaders: 2,
    localIdentName: "[local]_[hash:base64:5]"
  });

  expect(lessRule.use[2].loader).toContain("/postcss-loader");
  expect(lessRule.use[2].options.ident).toEqual("test-ident");
  expect(lessRule.use[2].options.plugins).not.toBeUndefined();

  expect(lessRule.use[3].loader).toContain("/less-loader");
  expect(lessRule.use[3].options).toEqual({
    javascriptEnabled: true,
    modifyVars: {
      "@less-variable": "#fff"
    }
  });
});

test("the webpack config is modified correctly with the modifyLessRule option", () => {
  applyCracoConfigAndOverrideWebpack({
    plugins: [
      {
        plugin: CracoLessPlugin,
        options: {
          modifyLessRule: (rule, context) => {
            if (context.env === "production") {
              rule.use[0].options.testOption = "test-value-production";
            } else {
              rule.use[0].options.testOption = "test-value-development";
            }
            return rule;
          }
        }
      }
    ]
  });

  const oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  expect(oneOfRule).not.toBeUndefined();
  const lessRule = oneOfRule.oneOf.find(
    r => r.test && r.test.toString() === "/\\.less$/"
  );
  expect(lessRule).not.toBeUndefined();

  expect(lessRule.use[0].loader).toContain("/style-loader");
  expect(lessRule.use[0].options.testOption).toEqual("test-value-development");

  expect(lessRule.use[2].loader).toContain("/postcss-loader");
  expect(lessRule.use[2].options.ident).toEqual("postcss");
  expect(lessRule.use[2].options.plugins).not.toBeUndefined();

  expect(lessRule.use[3].loader).toContain("/less-loader");
  expect(lessRule.use[3].options).toEqual({});
});

test("throws an error when we can't find file-loader in the webpack config", () => {
  let oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  oneOfRule.oneOf = oneOfRule.oneOf.filter(
    r => !(r.loader && r.loader.includes("file-loader"))
  );

  const runTest = () => {
    applyCracoConfigAndOverrideWebpack({
      plugins: [{ plugin: CracoLessPlugin }]
    });
  };

  expect(runTest).toThrowError(
    "Can't find file-loader in the development webpack config!\n\n" +
      "This error probably occurred because you updated react-scripts or craco. " +
      "Please try updating craco-less to the latest version:\n\n" +
      "   $ yarn upgrade craco-less\n\n" +
      "Or:\n\n" +
      "   $ npm update craco-less\n\n" +
      "If that doesn't work, craco-less needs to be fixed to support the latest version.\n" +
      "Please check to see if there's already an issue in the FormAPI/craco-less repo:\n\n" +
      "   * https://github.com/FormAPI/craco-less/issues?q=is%3Aissue+webpack+file-loader\n\n" +
      "If not, please open an issue and we'll take a look. (Or you can send a PR!)\n\n" +
      "You might also want to look for related issues in the " +
      "craco and create-react-app repos:\n\n" +
      "   * https://github.com/sharegate/craco/issues?q=is%3Aissue+webpack+file-loader\n" +
      "   * https://github.com/facebook/create-react-app/issues?q=is%3Aissue+webpack+file-loader\n"
  );
});

test("throws an error when we can't find the oneOf rules in the webpack config", () => {
  let oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  oneOfRule.oneOf = null;

  const runTest = () => {
    applyCracoConfigAndOverrideWebpack({
      plugins: [{ plugin: CracoLessPlugin }]
    });
  };

  expect(runTest).toThrowError(
    "Can't find a 'oneOf' rule under module.rules in the development webpack config!\n\n" +
      "This error probably occurred because you updated react-scripts or craco. " +
      "Please try updating craco-less to the latest version:\n\n" +
      "   $ yarn upgrade craco-less\n\n" +
      "Or:\n\n" +
      "   $ npm update craco-less\n\n" +
      "If that doesn't work, craco-less needs to be fixed to support the latest version.\n" +
      "Please check to see if there's already an issue in the FormAPI/craco-less repo:\n\n" +
      "   * https://github.com/FormAPI/craco-less/issues?q=is%3Aissue+webpack+rules+oneOf\n\n" +
      "If not, please open an issue and we'll take a look. (Or you can send a PR!)\n\n" +
      "You might also want to look for related issues in the " +
      "craco and create-react-app repos:\n\n" +
      "   * https://github.com/sharegate/craco/issues?q=is%3Aissue+webpack+rules+oneOf\n" +
      "   * https://github.com/facebook/create-react-app/issues?q=is%3Aissue+webpack+rules+oneOf\n"
  );
});

test("throws an error when react-scripts adds an unknown webpack rule", () => {
  let oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  const sassRule = oneOfRule.oneOf.find(rule =>
    rule.test.toString().includes("scss|sass")
  );
  sassRule.use.push({
    loader: "/unknown-loader/"
  });
  const runTest = () => {
    applyCracoConfigAndOverrideWebpack({
      plugins: [{ plugin: CracoLessPlugin }]
    });
  };
  expect(runTest).toThrowError();
});

test("throws an error when the sass rule is missing", () => {
  let oneOfRule = webpackConfig.module.rules.find(r => r.oneOf);
  oneOfRule.oneOf = oneOfRule.oneOf.filter(
    rule => !(rule.test && rule.test.toString().includes("scss|sass"))
  );
  const runTest = () => {
    applyCracoConfigAndOverrideWebpack({
      plugins: [{ plugin: CracoLessPlugin }]
    });
  };
  expect(runTest).toThrowError();
});