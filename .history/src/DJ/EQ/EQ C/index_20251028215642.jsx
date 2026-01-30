// EQ C - Just imports and re-exports EQ A with deck='C'
import EQA from '../EQ A';

const EQC = (props) => {
  return <EQA {...props} deck="C" />;
};

export default EQC;
