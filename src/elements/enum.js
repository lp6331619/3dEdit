export const TypeEnum = {
  template: {
    name: "模板",
    icon: "Sugar",
    sort: -1,
    span: 2,
  },
  border: {
    name: "边框",
    icon: "Dish",
    sort: 0,
    span: 2,
  },
  basis: {
    name: "基本",
    icon: "Mug",
    sort: 1,
    span: 3,
    mix: true,
  },
  // form: {
  //   name: "表单",
  //   sort: 2,
  //   show: false,
  // },
  echarts: {
    name: "图表",
    sort: 7,
    mix: true,
    icon: "PieChart",
    span: 3,
  },
  table: {
    name: "表格",
    sort: 8,
    icon: "Document",
    span: 3,
    mix: true,
  },
  staticSvg: {
    name: "图元",
    sort: 9,
    icon: "Brush",
    span: 3,
  },
  icon: {
    name: "图标",
    sort: 10,
    icon: "SetUp",
    span: 3,
  },
  background: {
    name: "背景",
    sort: 10,
    icon: "Dessert",
    span: 2,
  },
  three: {
    name: "模型",
    sort: 11,
    icon: "Dessert",
    span: 2,
  },
};

export const ApiTypeEnum = {
  disabled: -1,
  staticApi: 0,
  historyApi: 1,
  realApi: 2,
  // mixApi: 3, //这个现在值在table上使用，如果配置了那么 输出通道和历史通道其实是同样
};

export const ConditionSelect = {
  eq: {
    label: "==",
    value(a, b) {
      return a === b;
    },
  },
  nep: {
    label: "!=",
    value(a, b) {
      return a !== b;
    },
  },
  gt: {
    label: ">",
    value(a, b) {
      return a > b;
    },
  },
  lt: {
    label: "<",
    value(a, b) {
      return a < b;
    },
  },
  egt: {
    label: ">=",
    value(a, b) {
      return a >= b;
    },
  },
  elt: {
    label: "<=",
    value(a, b) {
      return a <= b;
    },
  },
};

export const NodeAlign = [
  {
    value: "left",
    desc: "左对齐",
  },
  {
    value: "right",
    desc: "右对齐",
  },
  {
    value: "top",
    desc: "顶部对齐",
  },
  {
    value: "bottom",
    desc: "底部对齐",
  },
  {
    value: "center",
    desc: "垂直居中",
  },
  {
    value: "middle",
    desc: "水平居中",
  },
];
