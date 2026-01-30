// Library C - Just imports and re-exports Library A with deck='C'
import LibraryA from '../Library A';

const LibraryC = (props) => {
  return <LibraryA {...props} deck="C" />;
};

export default LibraryC;
