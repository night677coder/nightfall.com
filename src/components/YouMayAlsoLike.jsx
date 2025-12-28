import React from 'react';
import Row from './Row';

function YouMayAlsoLike({ movies, onSelect }) {
  return (
    <section className="detail__recommend">
      <h2>You May Also Like</h2>
      <Row id="recommend" title="Recommended" movies={movies} onSelect={onSelect} />
    </section>
  );
}

export default YouMayAlsoLike;
