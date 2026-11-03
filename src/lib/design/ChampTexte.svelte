<script lang="ts">
  let {
    label,
    name,
    valeur = '',
    type = 'text',
    requis = false,
    erreur = '',
    aide = '',
    autocomplete,
    inputmode,
    placeholder,
    minlength,
    maxlength
  }: {
    label: string;
    name: string;
    valeur?: string;
    type?: string;
    requis?: boolean;
    erreur?: string;
    aide?: string;
    autocomplete?: import('svelte/elements').FullAutoFill | null;
    inputmode?: 'decimal' | 'numeric' | 'tel' | 'text';
    placeholder?: string;
    minlength?: number;
    maxlength?: number;
  } = $props();

  const id = $derived(`champ-${name}`);
</script>

<div class="champ-v2">
  <label for={id}>{label}{#if requis}<span aria-hidden="true"> *</span>{/if}</label>
  <input
    {id}
    {name}
    {type}
    value={valeur}
    required={requis}
    {autocomplete}
    {inputmode}
    {placeholder}
    {minlength}
    {maxlength}
    aria-invalid={erreur ? 'true' : undefined}
    aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
  />
  {#if erreur}<p class="erreur" id="{id}-erreur" role="alert">{erreur}</p>{/if}
  {#if aide && !erreur}<p class="aide" id="{id}-aide">{aide}</p>{/if}
</div>

<style>
  .champ-v2 { display: grid; gap: 6px; }
  label { font-weight: 700; font-size: 0.92rem; }
  input { min-height: 52px; font: inherit; padding: 10px 16px; border: 1.5px solid var(--bord-fort); border-radius: 14px; width: 100%; background: #fff; color: var(--encre); transition: border-color var(--transition), box-shadow var(--transition); }
  input::placeholder { color: #7a7a86; }
  input:focus { border-color: var(--encre); box-shadow: 0 0 0 3px rgb(30 30 34 / 0.1); outline: none; }
  input[aria-invalid='true'] { border-color: var(--cote); }
  .erreur { margin: 0; color: var(--cote-texte); font-weight: 600; font-size: 0.95rem; }
  .aide { margin: 0; color: var(--encre-douce); font-size: 0.95rem; }
</style>
