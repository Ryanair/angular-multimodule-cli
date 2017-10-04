const QUESTIONS = [
  {
    type: 'input',
    name: 'scope',
    message: 'Scope of your project eg. @angular',
    validate: (value: string) => value && value.indexOf('@') === 0
  }
];

export default QUESTIONS;
