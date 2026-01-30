// EQ D - Just imports and re-exports EQ B with deck='D'
import EQB from '../EQ B';

const EQD = (props) => {
  return <EQB {...props} deck="D" />;
};

export default EQD;
