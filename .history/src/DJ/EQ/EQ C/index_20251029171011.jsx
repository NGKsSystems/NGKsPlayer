// EQ C - Just imports and re-exports EQ A with deck='C'
import EQA from '../EQ A';
import './styles.css';

const EQC = (props) => {
  return <EQA {...props} deck="C" />;
};

export default EQC;
